import type { CorrectIndex, MissionId } from "./content";

export type QuestionIndex = 0 | 1 | 2;
export type AttemptAnswer = CorrectIndex | null;

export type ActiveAttempt = {
  missionId: MissionId;
  answers: [AttemptAnswer, AttemptAnswer, AttemptAnswer];
  revealedExplanation: [boolean, boolean, boolean];
  currentIndex: QuestionIndex;
};

export type CompletedMission = {
  completedAt: string;
  bestCorrectCount: number;
  attemptCount: number;
};

export type CompletedMissions = Partial<Record<MissionId, CompletedMission>>;

export type UnityMissionProgress = {
  schemaVersion: 1;
  nickname: string;
  createdAt: string;
  updatedAt: string;
  completedMissions: CompletedMissions;
  activeAttempt: ActiveAttempt | null;
  lastVisitedMissionId: MissionId | null;
};

export type LevelNumber = 1 | 2 | 3 | 4 | 5 | 6;

export type LevelSummary = {
  xp: number;
  level: LevelNumber;
  title: string;
};
