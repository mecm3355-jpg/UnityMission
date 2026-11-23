import { describe, expect, it } from "vitest";
import { getMissionById } from "../content/missions";
import { MISSION_IDS, type MissionId } from "../types/content";
import type { UnityMissionProgress } from "../types/progress";
import {
  advanceToNextQuestion,
  canCompleteActiveAttempt,
  completeActiveAttempt,
  createInitialProgress,
  getLevelForXp,
  getLevelSummary,
  getProgressPercent,
  getXp,
  hasCompletedAllMissions,
  isMissionUnlocked,
  revealCurrentExplanation,
  startMissionAttempt,
  submitCurrentAnswer,
} from "./game-engine";

const CREATED_AT = "2026-11-23T09:00:00.000Z";

function timestamp(step: number): string {
  return new Date(Date.parse(CREATED_AT) + step * 60_000).toISOString();
}

function playMission(
  initialProgress: UnityMissionProgress,
  missionId: MissionId,
  answers?: [number, number, number],
  startStep = 1,
) {
  const mission = getMissionById(missionId);
  if (!mission) {
    throw new Error("Test mission not found.");
  }

  const selectedAnswers = answers ?? mission.questions.map((question) => question.correctIndex);
  let progress = startMissionAttempt(initialProgress, missionId, timestamp(startStep));

  selectedAnswers.forEach((answer, index) => {
    progress = submitCurrentAnswer(progress, answer, timestamp(startStep + index * 3 + 1));
    progress = revealCurrentExplanation(progress, timestamp(startStep + index * 3 + 2));
    if (index < 2) {
      progress = advanceToNextQuestion(progress, timestamp(startStep + index * 3 + 3));
    }
  });

  return completeActiveAttempt(progress, timestamp(startStep + 10));
}

describe("XP and level derivation", () => {
  it("starts with 0 XP and level 1", () => {
    const progress = createInitialProgress("평화별", CREATED_AT);
    expect(getLevelSummary(progress)).toEqual({ xp: 0, level: 1, title: "첫걸음 탐험가" });
    expect(getProgressPercent(progress)).toBe(0);
  });

  it("awards 100 XP and level 2 for the first mission completion", () => {
    const initial = createInitialProgress("평화별", CREATED_AT);
    const result = playMission(initial, "mission-1");

    expect(result.xpAwarded).toBe(100);
    expect(result.firstCompletion).toBe(true);
    expect(result.correctCount).toBe(3);
    expect(getLevelSummary(result.progress)).toEqual({ xp: 100, level: 2, title: "평화의 새싹" });
  });

  it("does not award XP twice for the same mission", () => {
    const first = playMission(createInitialProgress("평화별", CREATED_AT), "mission-1");
    const replay = playMission(first.progress, "mission-1", [0, 0, 0], 20);

    expect(replay.xpAwarded).toBe(0);
    expect(replay.firstCompletion).toBe(false);
    expect(getXp(replay.progress.completedMissions)).toBe(100);
    expect(replay.progress.completedMissions["mission-1"]?.attemptCount).toBe(2);
  });

  it("derives 500 XP, level 6, and full completion from five missions", () => {
    let progress = createInitialProgress("평화별", CREATED_AT);
    MISSION_IDS.forEach((missionId, index) => {
      progress = playMission(progress, missionId, undefined, index * 20 + 1).progress;
    });

    expect(getLevelSummary(progress)).toEqual({ xp: 500, level: 6, title: "Unity Master" });
    expect(getProgressPercent(progress)).toBe(100);
    expect(hasCompletedAllMissions(progress)).toBe(true);
  });

  it("clamps level calculation to levels 1 through 6", () => {
    expect(getLevelForXp(-50)).toBe(1);
    expect(getLevelForXp(99)).toBe(1);
    expect(getLevelForXp(100)).toBe(2);
    expect(getLevelForXp(499)).toBe(5);
    expect(getLevelForXp(999)).toBe(6);
  });
});

describe("mission locking and attempt rules", () => {
  it("unlocks mission 1 by default and mission 2 only after mission 1", () => {
    const initial = createInitialProgress("평화별", CREATED_AT);
    expect(isMissionUnlocked("mission-1", initial.completedMissions)).toBe(true);
    expect(isMissionUnlocked("mission-2", initial.completedMissions)).toBe(false);

    const completed = playMission(initial, "mission-1").progress;
    expect(isMissionUnlocked("mission-2", completed.completedMissions)).toBe(true);
    expect(isMissionUnlocked("mission-3", completed.completedMissions)).toBe(false);
  });

  it("rejects invalid and locked mission direct entry", () => {
    const initial = createInitialProgress("평화별", CREATED_AT);
    expect(() => startMissionAttempt(initial, "mission-99", timestamp(1))).toThrow(
      "Unknown mission ID",
    );
    expect(() => startMissionAttempt(initial, "mission-2", timestamp(1))).toThrow("Mission is locked");
  });

  it("requires an answer before an explanation and an explanation before advancing", () => {
    const initial = createInitialProgress("평화별", CREATED_AT);
    const started = startMissionAttempt(initial, "mission-1", timestamp(1));

    expect(() => revealCurrentExplanation(started, timestamp(2))).toThrow(
      "An answer must be submitted",
    );
    const answered = submitCurrentAnswer(started, 3, timestamp(2));
    expect(() => advanceToNextQuestion(answered, timestamp(3))).toThrow(
      "The explanation must be revealed",
    );
  });

  it("allows wrong answers but requires all three explanations before completion", () => {
    const initial = createInitialProgress("평화별", CREATED_AT);
    let progress = startMissionAttempt(initial, "mission-1", timestamp(1));
    progress = submitCurrentAnswer(progress, 3, timestamp(2));
    progress = revealCurrentExplanation(progress, timestamp(3));

    expect(canCompleteActiveAttempt(progress)).toBe(false);
    expect(() => completeActiveAttempt(progress, timestamp(4))).toThrow(
      "All answers and explanations",
    );

    const completed = playMission(initial, "mission-1", [3, 3, 3]);
    expect(completed.firstCompletion).toBe(true);
    expect(completed.correctCount).toBeGreaterThanOrEqual(0);
  });

  it("keeps the first completion time and only raises the best replay score", () => {
    const first = playMission(
      createInitialProgress("평화별", CREATED_AT),
      "mission-1",
      [0, 0, 0],
    );
    const firstRecord = first.progress.completedMissions["mission-1"];
    const better = playMission(first.progress, "mission-1", undefined, 20);
    const worse = playMission(better.progress, "mission-1", [3, 3, 3], 40);
    const finalRecord = worse.progress.completedMissions["mission-1"];

    expect(finalRecord?.completedAt).toBe(firstRecord?.completedAt);
    expect(finalRecord?.bestCorrectCount).toBe(3);
    expect(finalRecord?.attemptCount).toBe(3);
    expect(worse.xpAwarded).toBe(0);
    expect(getXp(worse.progress.completedMissions)).toBe(100);
  });

  it("reports certificate eligibility only after every mission is complete", () => {
    let progress = createInitialProgress("평화별", CREATED_AT);
    expect(hasCompletedAllMissions(progress)).toBe(false);

    MISSION_IDS.forEach((missionId, index) => {
      progress = playMission(progress, missionId, undefined, index * 20 + 1).progress;
    });
    expect(hasCompletedAllMissions(progress)).toBe(true);
  });
});
