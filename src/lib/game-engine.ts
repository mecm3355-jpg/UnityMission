import { getMissionById, isMissionId } from "../content/missions";
import { MISSION_IDS, type CorrectIndex, type MissionId } from "../types/content";
import type {
  ActiveAttempt,
  CompletedMissions,
  LevelNumber,
  LevelSummary,
  QuestionIndex,
  UnityMissionProgress,
} from "../types/progress";

export const XP_PER_MISSION = 100;
export const MAX_XP = 500;
export const MISSION_PASS_CORRECT_COUNT = 2;

const LEVEL_TITLES: Record<LevelNumber, string> = {
  1: "첫걸음 탐험가",
  2: "평화의 새싹",
  3: "협력 탐험가",
  4: "평화 길잡이",
  5: "미래 설계자",
  6: "Unity Master",
};

export type CompletionResult = {
  progress: UnityMissionProgress;
  correctCount: number;
  xpAwarded: 0 | 100;
  firstCompletion: boolean;
  passed: boolean;
};

function assertIsoTimestamp(value: string): void {
  if (typeof value !== "string" || value.length === 0 || Number.isNaN(Date.parse(value))) {
    throw new Error("A valid ISO timestamp is required.");
  }
}

function assertAnswerIndex(value: number): asserts value is CorrectIndex {
  if (!Number.isInteger(value) || value < 0 || value > 3) {
    throw new RangeError("Answer index must be an integer from 0 to 3.");
  }
}

function getActiveAttempt(progress: UnityMissionProgress): ActiveAttempt {
  if (!progress.activeAttempt) {
    throw new Error("No active mission attempt exists.");
  }

  return progress.activeAttempt;
}

export function normalizeNickname(value: string): string {
  const nickname = value.trim();
  if (nickname.length < 2 || nickname.length > 12) {
    throw new RangeError("Nickname must contain 2 to 12 characters.");
  }

  return nickname;
}

export function createInitialProgress(nickname: string, createdAt: string): UnityMissionProgress {
  assertIsoTimestamp(createdAt);

  return {
    schemaVersion: 1,
    nickname: normalizeNickname(nickname),
    createdAt,
    updatedAt: createdAt,
    completedMissions: {},
    activeAttempt: null,
    lastVisitedMissionId: null,
  };
}

export function getCompletedMissionIds(completedMissions: CompletedMissions): MissionId[] {
  return MISSION_IDS.filter((missionId) => completedMissions[missionId] !== undefined);
}

export function getXp(completedMissions: CompletedMissions): number {
  return getCompletedMissionIds(completedMissions).length * XP_PER_MISSION;
}

export function getLevelForXp(xp: number): LevelNumber {
  const clampedXp = Math.min(MAX_XP, Math.max(0, Math.floor(xp)));
  return Math.min(6, Math.floor(clampedXp / XP_PER_MISSION) + 1) as LevelNumber;
}

export function getLevelSummary(progress: UnityMissionProgress): LevelSummary {
  const xp = getXp(progress.completedMissions);
  const level = getLevelForXp(xp);
  return { xp, level, title: LEVEL_TITLES[level] };
}

export function getProgressPercent(progress: UnityMissionProgress): number {
  return (getCompletedMissionIds(progress.completedMissions).length / MISSION_IDS.length) * 100;
}

export function isMissionUnlocked(
  missionId: string,
  completedMissions: CompletedMissions,
): boolean {
  if (!isMissionId(missionId)) {
    return false;
  }

  const index = MISSION_IDS.indexOf(missionId);
  return index === 0 || completedMissions[MISSION_IDS[index - 1]] !== undefined;
}

export function hasCompletedAllMissions(progress: UnityMissionProgress): boolean {
  return getCompletedMissionIds(progress.completedMissions).length === MISSION_IDS.length;
}

export function startMissionAttempt(
  progress: UnityMissionProgress,
  missionId: string,
  updatedAt: string,
): UnityMissionProgress {
  assertIsoTimestamp(updatedAt);
  if (!isMissionId(missionId)) {
    throw new Error("Unknown mission ID.");
  }
  if (!isMissionUnlocked(missionId, progress.completedMissions)) {
    throw new Error("Mission is locked.");
  }

  return {
    ...progress,
    updatedAt,
    lastVisitedMissionId: missionId,
    activeAttempt: {
      missionId,
      answers: [null, null, null],
      revealedExplanation: [false, false, false],
      currentIndex: 0,
    },
  };
}

export function submitCurrentAnswer(
  progress: UnityMissionProgress,
  answerIndex: number,
  updatedAt: string,
): UnityMissionProgress {
  assertIsoTimestamp(updatedAt);
  assertAnswerIndex(answerIndex);
  const attempt = getActiveAttempt(progress);
  const index = attempt.currentIndex;

  if (attempt.revealedExplanation[index]) {
    throw new Error("An answer cannot change after its explanation is revealed.");
  }

  const answers: ActiveAttempt["answers"] = [...attempt.answers];
  answers[index] = answerIndex;

  return {
    ...progress,
    updatedAt,
    activeAttempt: { ...attempt, answers },
  };
}

export function revealCurrentExplanation(
  progress: UnityMissionProgress,
  updatedAt: string,
): UnityMissionProgress {
  assertIsoTimestamp(updatedAt);
  const attempt = getActiveAttempt(progress);
  const index = attempt.currentIndex;

  if (attempt.answers[index] === null) {
    throw new Error("An answer must be submitted before revealing the explanation.");
  }

  const revealedExplanation: ActiveAttempt["revealedExplanation"] = [
    ...attempt.revealedExplanation,
  ];
  revealedExplanation[index] = true;

  return {
    ...progress,
    updatedAt,
    activeAttempt: { ...attempt, revealedExplanation },
  };
}

export function advanceToNextQuestion(
  progress: UnityMissionProgress,
  updatedAt: string,
): UnityMissionProgress {
  assertIsoTimestamp(updatedAt);
  const attempt = getActiveAttempt(progress);
  const index = attempt.currentIndex;

  if (!attempt.revealedExplanation[index]) {
    throw new Error("The explanation must be revealed before advancing.");
  }
  if (index >= 2) {
    throw new Error("The active attempt is already on its last question.");
  }

  return {
    ...progress,
    updatedAt,
    activeAttempt: {
      ...attempt,
      currentIndex: (index + 1) as QuestionIndex,
    },
  };
}

export function canCompleteActiveAttempt(progress: UnityMissionProgress): boolean {
  const attempt = progress.activeAttempt;
  return (
    attempt !== null &&
    attempt.answers.every((answer) => answer !== null) &&
    attempt.revealedExplanation.every(Boolean)
  );
}

export function completeActiveAttempt(
  progress: UnityMissionProgress,
  completedAt: string,
): CompletionResult {
  assertIsoTimestamp(completedAt);
  const attempt = getActiveAttempt(progress);

  if (!canCompleteActiveAttempt(progress)) {
    throw new Error("All answers and explanations are required before completion.");
  }
  if (!isMissionUnlocked(attempt.missionId, progress.completedMissions)) {
    throw new Error("Mission is locked.");
  }

  const mission = getMissionById(attempt.missionId);
  if (!mission) {
    throw new Error("Unknown mission ID.");
  }

  const correctCount = attempt.answers.reduce<number>((count, answer, index) => {
    return count + (answer === mission.questions[index].correctIndex ? 1 : 0);
  }, 0);
  const previous = progress.completedMissions[attempt.missionId];
  const passed = correctCount >= MISSION_PASS_CORRECT_COUNT;
  const firstCompletion = passed && previous === undefined;

  const completedMissions: CompletedMissions = previous
    ? {
        ...progress.completedMissions,
        [attempt.missionId]: {
          ...previous,
          bestCorrectCount: Math.max(previous.bestCorrectCount, correctCount),
          attemptCount: previous.attemptCount + 1,
        },
      }
    : passed
      ? {
          ...progress.completedMissions,
          [attempt.missionId]: {
            completedAt,
            bestCorrectCount: correctCount,
            attemptCount: 1,
          },
        }
      : progress.completedMissions;

  return {
    progress: {
      ...progress,
      updatedAt: completedAt,
      completedMissions,
      activeAttempt: null,
      lastVisitedMissionId: attempt.missionId,
    },
    correctCount,
    xpAwarded: firstCompletion ? XP_PER_MISSION : 0,
    firstCompletion,
    passed,
  };
}
