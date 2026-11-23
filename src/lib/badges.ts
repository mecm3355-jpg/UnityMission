import type { MissionId } from "../types/content";
import type { CompletedMissions } from "../types/progress";

export type BadgeDefinition = {
  missionId: MissionId;
  title: string;
  label: string;
  description: string;
  condition: string;
};

export type BadgeSummary = BadgeDefinition & {
  earned: boolean;
  earnedAt: string | null;
};

export const BADGE_DEFINITIONS: readonly BadgeDefinition[] = [
  {
    missionId: "mission-1",
    title: "역사 길잡이",
    label: "역사",
    description: "분단의 주요 역사적 흐름을 살펴본 학습자",
    condition: "미션 1 완료",
  },
  {
    missionId: "mission-2",
    title: "언어 이음이",
    label: "언어",
    description: "남북의 일상과 언어 차이를 이해한 학습자",
    condition: "미션 2 완료",
  },
  {
    missionId: "mission-3",
    title: "평화 대화가",
    label: "대화",
    description: "평화적인 갈등 해결 방법을 익힌 학습자",
    condition: "미션 3 완료",
  },
  {
    missionId: "mission-4",
    title: "협력 실천가",
    label: "협력",
    description: "인도적·문화·환경 협력의 가치를 배운 학습자",
    condition: "미션 4 완료",
  },
  {
    missionId: "mission-5",
    title: "미래 설계자",
    label: "미래",
    description: "다양한 관점으로 평화로운 미래를 그린 학습자",
    condition: "미션 5 완료",
  },
] as const;

export function getBadgeSummaries(completedMissions: CompletedMissions): BadgeSummary[] {
  return BADGE_DEFINITIONS.map((badge) => {
    const completion = completedMissions[badge.missionId];
    return {
      ...badge,
      earned: completion !== undefined,
      earnedAt: completion?.completedAt ?? null,
    };
  });
}
