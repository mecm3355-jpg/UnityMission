import { isMissionUnlocked } from "../lib/game-engine";
import type { CompletedMissions } from "../types/progress";
import type { MissionId } from "../types/content";

export type NpcId = "history-guide" | "culture-explorer" | "peace-negotiator" | "cooperation-researcher" | "future-designer";

export type NpcDefinition = {
  id: NpcId;
  name: string;
  role: string;
  missionId: MissionId;
  x: number;
  y: number;
  color: number;
  greeting: string;
  completedMessage: string;
};

export const NPC_INTERACTION_DISTANCE = 74;

export const NPCS: readonly NpcDefinition[] = [
  {
    id: "history-guide",
    name: "기록이",
    role: "역사 안내자",
    missionId: "mission-1",
    x: 560,
    y: 450,
    color: 0xe2a76f,
    greeting: "평화의 첫 조각은 지나온 시간을 이해할 때 모습을 드러내요. 분단의 역사를 함께 살펴볼까요?",
    completedMessage: "당신이 지켜 낸 역사 조각이 광장을 밝히고 있어요. 기록을 기억하는 일이 평화의 시작입니다.",
  },
  {
    id: "culture-explorer",
    name: "마루",
    role: "문화 탐험가",
    missionId: "mission-2",
    x: 1360,
    y: 450,
    color: 0xd07ab4,
    greeting: "같은 말도 지역마다 조금씩 다르게 피어나요. 남북의 일상과 언어를 탐험해 볼래요?",
    completedMessage: "서로 다른 표현 속에서도 이어지는 마음을 찾았군요. 문화 조각이 더 환하게 빛나요.",
  },
  {
    id: "peace-negotiator",
    name: "온유",
    role: "평화 협상가",
    missionId: "mission-3",
    x: 560,
    y: 840,
    color: 0x67a9cf,
    greeting: "갈등은 피하는 것보다 안전하게 풀어 가는 법을 배우는 게 중요해요. 대화의 기술을 연습해 볼까요?",
    completedMessage: "경청과 존중으로 평화 조각을 완성했군요. 마을의 목소리가 한결 부드러워졌어요.",
  },
  {
    id: "cooperation-researcher",
    name: "다온",
    role: "협력 연구자",
    missionId: "mission-4",
    x: 1360,
    y: 840,
    color: 0x67bd91,
    greeting: "혼자서는 풀 수 없는 문제도 힘을 합치면 길이 보여요. 협력의 원리를 조사해 주세요.",
    completedMessage: "협력 조각의 공명이 안정됐어요. 연구소의 세 공명석도 이제 당신의 손길을 기다립니다.",
  },
  {
    id: "future-designer",
    name: "새봄",
    role: "미래 설계자",
    missionId: "mission-5",
    x: 1120,
    y: 920,
    color: 0x8c90d8,
    greeting: "우리가 바라는 미래는 참여하는 사람들의 선택으로 만들어져요. 마지막 설계도를 완성해 주세요.",
    completedMessage: "다섯 조각이 모두 모였어요. 중앙 광장의 평화의 나무로 가서 새로운 마을을 열어 주세요.",
  },
] as const;

export type NpcQuestState = "locked" | "available" | "completed";

export function getNpcById(id: string): NpcDefinition | undefined {
  return NPCS.find((npc) => npc.id === id);
}

export function getNpcQuestState(npc: NpcDefinition, completedMissions: CompletedMissions): NpcQuestState {
  if (completedMissions[npc.missionId]) return "completed";
  return isMissionUnlocked(npc.missionId, completedMissions) ? "available" : "locked";
}

export function getNpcMessage(npc: NpcDefinition, completedMissions: CompletedMissions): string {
  const state = getNpcQuestState(npc, completedMissions);
  if (state === "completed") return npc.completedMessage;
  if (state === "locked") return "아직 이 구역의 길은 잠겨 있어요. 먼저 앞선 평화 조각을 찾아오세요.";
  return npc.greeting;
}

export function findNearbyNpc(x: number, y: number, maxDistance = NPC_INTERACTION_DISTANCE): NpcDefinition | undefined {
  return NPCS.map((npc) => ({ npc, distance: Math.hypot(npc.x - x, npc.y - y) }))
    .filter(({ distance }) => distance <= maxDistance)
    .sort((a, b) => a.distance - b.distance)[0]?.npc;
}
