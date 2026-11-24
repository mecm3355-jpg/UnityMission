import { describe, expect, it } from "vitest";
import { NPCS, findNearbyNpc, getNextQuestNpc, getNpcDialogueTurns, getNpcMessage, getNpcQuestState } from "./npcs";
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

  it("derives the next quest guide from the shared completion ledger", () => {
    expect(getNextQuestNpc({})?.id).toBe("history-guide");
    expect(getNextQuestNpc(completed(["mission-1", "mission-2"]))?.id).toBe("peace-negotiator");
    expect(getNextQuestNpc(completed(["mission-1", "mission-2", "mission-3", "mission-4", "mission-5"]))).toBeUndefined();
  });

  it("builds alternating player and NPC dialogue without duplicating mission questions", () => {
    const available = getNpcDialogueTurns(NPCS[0], {}, "평화별");
    expect(available.map((turn) => turn.speaker)).toEqual(["npc", "player", "npc"]);
    expect(available[0].text).toBe(NPCS[0].greeting);
    expect(available[1].text).toBe(NPCS[0].playerReply);
    expect(available[2].text).toBe(NPCS[0].questPrompt);

    const finished = getNpcDialogueTurns(NPCS[0], completed(["mission-1"]), "평화별");
    expect(finished.map((turn) => turn.speaker)).toEqual(["player", "npc", "player"]);
    expect(finished[1].text).toBe(NPCS[0].completedMessage);
  });
});
