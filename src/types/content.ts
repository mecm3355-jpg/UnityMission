export const MISSION_IDS = [
  "mission-1",
  "mission-2",
  "mission-3",
  "mission-4",
  "mission-5",
] as const;

export type MissionId = (typeof MISSION_IDS)[number];
export type MissionOrder = 1 | 2 | 3 | 4 | 5;
export type QuestionNumber = 1 | 2 | 3;
export type QuestionId = `${MissionId}-q${QuestionNumber}`;
export type CorrectIndex = 0 | 1 | 2 | 3;

export type ContentSource = {
  title: string;
  organization: string;
  url: string;
  reviewedAt: string;
};

export type MissionQuestion = {
  id: QuestionId;
  prompt: string;
  options: [string, string, string, string];
  correctIndex: CorrectIndex;
  explanation: string;
  source: ContentSource;
};

export type Mission = {
  id: MissionId;
  order: MissionOrder;
  title: string;
  summary: string;
  background: string;
  learningObjectives: [string, string];
  rewardXp: 100;
  questions: [MissionQuestion, MissionQuestion, MissionQuestion];
};
