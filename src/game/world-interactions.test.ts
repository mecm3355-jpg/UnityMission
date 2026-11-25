import { describe, expect, it } from "vitest";
import { findNearbyWorldInteraction } from "./world-interactions";

describe("R06 world interactions", () => {
  it("finds only the final peace tree within range", () => {
    expect(findNearbyWorldInteraction(1480, 840)).toBeUndefined();
    expect(findNearbyWorldInteraction(1080, 720)?.kind).toBe("ending");
    expect(findNearbyWorldInteraction(960, 720)).toBeUndefined();
  });
});
