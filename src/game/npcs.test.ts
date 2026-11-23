import { describe, expect, it } from "vitest";
import { NPCS, findNearbyNpc, getNpcMessage, getNpcQuestState } from "./npcs";
import type { CompletedMissions } from "../types/progress";

const completed = (ids: string[]): CompletedMissions => Object.fromEntries(
  ids.map((id) => [id, { completedAt: "2026-11-23T10:00:00.000Z", bestCorrectCount: 3, attemptCount: 1 }]),
) as CompletedMissions;

describe("R04 NPC model", () => {
  it("defines five unique NPCs mapped to the five existing missions", () => {
    expect(NPCS).toHaveLength(5);
    expect(new Set(NPCS.map((npc) => npc.id)).size).toBe(5);
    expect(NPCS.map((npc) => npc.missionId)).toEqual([
      "mission-1", "mission-2", "mission-3", "mission-4", "mission-5",
    ]);
  });

  it("derives locked, available, and completed reactions from the shared ledger", () => {
    expect(getNpcQuestState(NPCS[0], {})).toBe("available");
    expect(getNpcQuestState(NPCS[1], {})).toBe("locked");
    expect(getNpcQuestState(NPCS[1], completed(["mission-1"]))).toBe("available");
    expect(getNpcQuestState(NPCS[0], completed(["mission-1"]))).toBe("completed");
    expect(getNpcMessage(NPCS[0], completed(["mission-1"]))).toContain("역사 조각");
  });

  it("selects an NPC only inside the interaction radius", () => {
    expect(findNearbyNpc(NPCS[0].x + 30, NPCS[0].y)?.id).toBe(NPCS[0].id);
    expect(findNearbyNpc(960, 720)).toBeUndefined();
  });
});
