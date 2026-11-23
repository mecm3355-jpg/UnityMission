import type { NpcId } from "./npcs";
import type { WorldInteractionId } from "./world-interactions";

export type GameWorldSnapshot = {
  fragmentCount: number;
  puzzleSequence: string[];
  puzzleSolved: boolean;
};

export type GameBridge = {
  onNearbyNpcChange: (npcId: NpcId | null) => void;
  onNpcInteract: (npcId: NpcId) => void;
  onNearbyWorldInteractionChange: (interactionId: WorldInteractionId | null) => void;
  onWorldInteract: (interactionId: WorldInteractionId) => void;
};
