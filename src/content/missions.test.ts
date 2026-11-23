import { describe, expect, it } from "vitest";
import rawMissions from "./missions.json";
import {
  getMissionById,
  isMissionId,
  missions,
  validateMissionContent,
} from "./missions";
import { MISSION_IDS } from "../types/content";

describe("mission content schema", () => {
  it("contains five missions, three questions each, and fifteen questions total", () => {
    expect(missions).toHaveLength(5);
    expect(missions.every((mission) => mission.questions.length === 3)).toBe(true);
    expect(missions.flatMap((mission) => mission.questions)).toHaveLength(15);
  });

  it("uses the ordered mission and question ID contract", () => {
    expect(missions.map((mission) => mission.id)).toEqual(MISSION_IDS);
    expect(missions.map((mission) => mission.order)).toEqual([1, 2, 3, 4, 5]);

    const questionIds = missions.flatMap((mission) =>
      mission.questions.map((question) => question.id),
    );
    expect(new Set(questionIds).size).toBe(15);
    expect(questionIds).toEqual(
      MISSION_IDS.flatMap((missionId) => [1, 2, 3].map((number) => `${missionId}-q${number}`)),
    );
  });

  it("gives every question four unique choices and a valid answer index", () => {
    for (const question of missions.flatMap((mission) => mission.questions)) {
      expect(question.options).toHaveLength(4);
      expect(new Set(question.options).size).toBe(4);
      expect(Number.isInteger(question.correctIndex)).toBe(true);
      expect(question.correctIndex).toBeGreaterThanOrEqual(0);
      expect(question.correctIndex).toBeLessThanOrEqual(3);
      expect(question.explanation.trim().length).toBeGreaterThan(0);
    }
  });

  it("requires a reviewed official HTTPS source for every question", () => {
    const validation = validateMissionContent(rawMissions);
    expect(validation).toEqual({ valid: true, errors: [] });

    for (const question of missions.flatMap((mission) => mission.questions)) {
      expect(question.source.title.trim().length).toBeGreaterThan(0);
      expect(question.source.organization.trim().length).toBeGreaterThan(0);
      expect(question.source.url).toMatch(/^https:\/\//);
      expect(question.source.reviewedAt).toBe("2026-11-23");
    }
  });

  it("rejects malformed IDs, choices, answer indexes, and source URLs", () => {
    const malformed = structuredClone(rawMissions) as unknown as Array<{
      id: string;
      questions: Array<{
        options: string[];
        correctIndex: number;
        source: { url: string };
      }>;
    }>;
    malformed[0].id = "mission-99";
    malformed[0].questions[0].options = ["one"];
    malformed[0].questions[1].correctIndex = 4;
    malformed[0].questions[2].source.url = "http://example.com/not-official";

    const validation = validateMissionContent(malformed);
    expect(validation.valid).toBe(false);
    expect(validation.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining("id must be mission-1"),
        expect.stringContaining("options must contain exactly four"),
        expect.stringContaining("correctIndex must be an integer from 0 to 3"),
        expect.stringContaining("approved official HTTPS URL"),
      ]),
    );
  });
});

describe("mission lookup contract", () => {
  it("accepts only the five documented mission IDs", () => {
    expect(MISSION_IDS.every(isMissionId)).toBe(true);
    expect(isMissionId("mission-0")).toBe(false);
    expect(isMissionId("mission-6")).toBe(false);
    expect(isMissionId("<script>alert(1)</script>")).toBe(false);
  });

  it("returns a known mission and rejects an unknown mission", () => {
    expect(getMissionById("mission-5")?.title).toBe("평화로운 미래에 참여해요");
    expect(getMissionById("mission-99")).toBeUndefined();
  });
});
