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
  playerReply: string;
  questPrompt: string;
  completedMessage: string;
};

export type DialogueSpeaker = "npc" | "player";
export type DialogueTurn = { speaker: DialogueSpeaker; text: string };
export type DialogueSequence = readonly [DialogueTurn, DialogueTurn, DialogueTurn];

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
    playerReply: "흩어진 기록을 따라가며 평화의 첫 조각을 찾아볼게요.",
    questPrompt: "좋아요. 세 개의 역사 기록을 차근차근 확인하면 조각이 응답할 거예요. 준비됐나요?",
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
    playerReply: "서로 다른 표현 속에 이어지는 마음을 직접 찾아보고 싶어요.",
    questPrompt: "멋진 태도예요. 세 가지 문화 단서를 살피고 공통점을 발견해 주세요.",
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
    playerReply: "상대의 말을 듣고 제 생각도 평화롭게 전하는 법을 배우고 싶어요.",
    questPrompt: "그 마음이면 충분해요. 세 상황에서 경청과 존중의 선택을 찾아보세요.",
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
    playerReply: "마을 사람들이 함께 해결할 수 있는 방법을 조사해 볼게요.",
    questPrompt: "연구 준비 완료! 세 가지 협력 사례를 분석하면 공명석의 비밀도 가까워질 거예요.",
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
    playerReply: "모두가 함께 그릴 수 있는 평화로운 미래를 설계해 보고 싶어요.",
    questPrompt: "마지막 설계 단계예요. 세 가지 미래 선택을 살피고 당신의 평화 조각을 완성해 주세요.",
    completedMessage: "다섯 조각이 모두 모였어요. 중앙 광장의 평화의 나무로 가서 새로운 마을을 열어 주세요.",
  },
] as const;

export type NpcQuestState = "locked" | "available" | "completed";

export function getNpcById(id: string): NpcDefinition | undefined {
  return NPCS.find((npc) => npc.id === id);
}

export function getNextQuestNpc(completedMissions: CompletedMissions): NpcDefinition | undefined {
  return NPCS.find((npc) => !completedMissions[npc.missionId]);
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

export function getNpcDialogueTurns(
  npc: NpcDefinition,
  completedMissions: CompletedMissions,
  playerName: string,
): DialogueSequence {
  const state = getNpcQuestState(npc, completedMissions);
  if (state === "available") {
    return [
      { speaker: "npc", text: npc.greeting },
      { speaker: "player", text: npc.playerReply },
      { speaker: "npc", text: npc.questPrompt },
    ];
  }
  if (state === "completed") {
    return [
      { speaker: "player", text: `${npc.name}님, 맡겨 주신 임무를 마쳤어요.` },
      { speaker: "npc", text: npc.completedMessage },
      { speaker: "player", text: "함께 만든 변화를 기억하면서 마을을 더 둘러볼게요." },
    ];
  }
  return [
    { speaker: "player", text: `${npc.name}님, 저도 이 구역의 평화 조각을 찾고 싶어요.` },
    { speaker: "npc", text: getNpcMessage(npc, completedMissions) },
    { speaker: "player", text: `${playerName}, 먼저 앞선 평화 조각부터 차근차근 찾아보자.` },
  ];
}

export function findNearbyNpc(x: number, y: number, maxDistance = NPC_INTERACTION_DISTANCE): NpcDefinition | undefined {
  return NPCS.map((npc) => ({ npc, distance: Math.hypot(npc.x - x, npc.y - y) }))
    .filter(({ distance }) => distance <= maxDistance)
    .sort((a, b) => a.distance - b.distance)[0]?.npc;
}
