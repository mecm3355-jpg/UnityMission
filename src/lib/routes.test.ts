import { describe, expect, it } from "vitest";
import { APP_ROUTES, missionRoute } from "./routes";

describe("T01 route contract", () => {
  it("defines all seven P0 screen routes", () => {
    expect(APP_ROUTES).toEqual([
      "/",
      "/dashboard",
      "/mission/[id]",
      "/mission/[id]/play",
      "/mission/[id]/result",
      "/badges",
      "/certificate",
    ]);
  });

  it("builds a mission detail route", () => {
    expect(missionRoute("mission-1")).toBe("/mission/mission-1");
  });
});
