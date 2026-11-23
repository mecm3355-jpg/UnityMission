import type { PuzzleStoneId } from "./rpg-progress";

export type WorldInteractionId = PuzzleStoneId | "peace-tree";
export type WorldInteraction = {
  id: WorldInteractionId;
  label: string;
  x: number;
  y: number;
  kind: "puzzle" | "ending";
};

export const WORLD_INTERACTION_DISTANCE = 72;
export const WORLD_INTERACTIONS: readonly WorldInteraction[] = [
  { id: "blue", label: "푸른 공명석", x: 1480, y: 840, kind: "puzzle" },
  { id: "gold", label: "황금 공명석", x: 1560, y: 840, kind: "puzzle" },
  { id: "green", label: "초록 공명석", x: 1640, y: 840, kind: "puzzle" },
  { id: "peace-tree", label: "평화의 나무", x: 1080, y: 720, kind: "ending" },
] as const;

export function findNearbyWorldInteraction(x: number, y: number, maxDistance = WORLD_INTERACTION_DISTANCE): WorldInteraction | undefined {
  return WORLD_INTERACTIONS.map((interaction) => ({ interaction, distance: Math.hypot(interaction.x - x, interaction.y - y) }))
    .filter(({ distance }) => distance <= maxDistance)
    .sort((a, b) => a.distance - b.distance)[0]?.interaction;
}
