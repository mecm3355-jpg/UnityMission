export type WorldInteractionId = "peace-tree";
export type WorldInteraction = {
  id: WorldInteractionId;
  label: string;
  x: number;
  y: number;
  kind: "ending";
};

export const WORLD_INTERACTION_DISTANCE = 72;
export const WORLD_INTERACTIONS: readonly WorldInteraction[] = [
  { id: "peace-tree", label: "평화의 나무", x: 1080, y: 720, kind: "ending" },
] as const;

export function findNearbyWorldInteraction(
  x: number,
  y: number,
  maxDistance = WORLD_INTERACTION_DISTANCE,
): WorldInteraction | undefined {
  return WORLD_INTERACTIONS.map((interaction) => ({
    interaction,
    distance: Math.hypot(interaction.x - x, interaction.y - y),
  }))
    .filter(({ distance }) => distance <= maxDistance)
    .sort((a, b) => a.distance - b.distance)[0]?.interaction;
}
