import type { NpcId, NpcQuestState } from "./npcs";
import type { WorldInteractionId } from "./world-interactions";
import type { ZoneId } from "./world";

export type GameWorldSnapshot = {
  fragmentCount: number;
  nextNpcId?: NpcId | null;
  npcQuestStates?: Partial<Record<NpcId, NpcQuestState>>;
  questTarget?: { x: number; y: number; label: string } | null;
};

export type GameBridge = {
  onNearbyNpcChange: (npcId: NpcId | null) => void;
  onNpcInteract: (npcId: NpcId) => void;
  onNearbyWorldInteractionChange: (interactionId: WorldInteractionId | null) => void;
  onWorldInteract: (interactionId: WorldInteractionId) => void;
  onPlayerStep?: () => void;
  onZoneChange?: (zoneId: ZoneId | "path") => void;
};
