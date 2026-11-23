import { describe, expect, it } from "vitest";
import { APP_ROUTES, missionRoute } from "./routes";

describe("application route contract", () => {
  it("keeps the seven dashboard routes and adds the RPG route", () => {
    expect(APP_ROUTES).toEqual([
      "/",
      "/game",
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
