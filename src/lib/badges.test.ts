import { describe, expect, it } from "vitest";
import type { CompletedMissions } from "../types/progress";
import { BADGE_DEFINITIONS, getBadgeSummaries } from "./badges";

describe("badge derivation", () => {
  it("defines one unique badge for each mission", () => {
    expect(BADGE_DEFINITIONS).toHaveLength(5);
    expect(new Set(BADGE_DEFINITIONS.map((badge) => badge.missionId)).size).toBe(5);
    expect(new Set(BADGE_DEFINITIONS.map((badge) => badge.title)).size).toBe(5);
  });

  it("starts with five locked badges", () => {
    const badges = getBadgeSummaries({});
    expect(badges.every((badge) => !badge.earned && badge.earnedAt === null)).toBe(true);
  });

  it("derives earned state and date only from completed missions", () => {
    const completedMissions: CompletedMissions = {
      "mission-1": {
        completedAt: "2026-11-23T09:10:00.000Z",
        bestCorrectCount: 2,
        attemptCount: 3,
      },
      "mission-2": {
        completedAt: "2026-11-23T09:20:00.000Z",
        bestCorrectCount: 3,
        attemptCount: 1,
      },
    };

    const badges = getBadgeSummaries(completedMissions);
    expect(badges.filter((badge) => badge.earned)).toHaveLength(2);
    expect(badges[0]).toMatchObject({
      missionId: "mission-1",
      earned: true,
      earnedAt: "2026-11-23T09:10:00.000Z",
    });
    expect(badges[2]).toMatchObject({ missionId: "mission-3", earned: false, earnedAt: null });
  });
});
