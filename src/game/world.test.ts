import { describe, expect, it } from "vitest";
import {
  PLAYER_SPEED,
  WORLD_HEIGHT,
  WORLD_OBSTACLES,
  WORLD_WIDTH,
  WORLD_ZONES,
  getFacingDirection,
  getMovementVelocity,
  getZoneAt,
  pointInsideObstacle,
} from "./world";

describe("R03 peace village world", () => {
  it("defines one 1920x1280 world with all six playable zones", () => {
    expect({ width: WORLD_WIDTH, height: WORLD_HEIGHT }).toEqual({ width: 1920, height: 1280 });
    expect(WORLD_ZONES.map((zone) => zone.id)).toEqual([
      "history", "culture", "plaza", "peace", "cooperation", "future",
    ]);
  });

  it("normalizes diagonal movement to the same speed as cardinal movement", () => {
    const cardinal = getMovementVelocity({ up: false, down: false, left: false, right: true });
    const diagonal = getMovementVelocity({ up: true, down: false, left: false, right: true });
    expect(Math.hypot(cardinal.x, cardinal.y)).toBeCloseTo(PLAYER_SPEED);
    expect(Math.hypot(diagonal.x, diagonal.y)).toBeCloseTo(PLAYER_SPEED);
    expect(diagonal.x).toBeGreaterThan(0);
    expect(diagonal.y).toBeLessThan(0);
  });

  it("keeps the previous facing while idle and selects a cardinal facing while moving", () => {
    expect(getFacingDirection({ x: 0, y: 0 }, "left")).toBe("left");
    expect(getFacingDirection({ x: 0, y: -100 })).toBe("up");
    expect(getFacingDirection({ x: 120, y: 40 })).toBe("right");
  });

  it("maps coordinates to zones and exposes solid obstacles", () => {
    expect(getZoneAt(960, 720)?.id).toBe("plaza");
    expect(getZoneAt(300, 220)?.id).toBe("history");
    expect(WORLD_OBSTACLES.length).toBeGreaterThanOrEqual(15);
    expect(pointInsideObstacle(960, 590)).toBe(true);
    expect(pointInsideObstacle(960, 720)).toBe(false);
  });
});
