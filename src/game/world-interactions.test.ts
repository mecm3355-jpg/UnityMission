import { describe, expect, it } from "vitest";
import { findNearbyWorldInteraction } from "./world-interactions";

describe("R06 world interactions", () => {
  it("finds puzzle stones and the final peace tree only within range", () => {
    expect(findNearbyWorldInteraction(1480, 840)?.id).toBe("blue");
    expect(findNearbyWorldInteraction(1080, 720)?.kind).toBe("ending");
    expect(findNearbyWorldInteraction(960, 720)).toBeUndefined();
  });
});
