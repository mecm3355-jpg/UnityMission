// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { GameAudioController } from "./audio";

const originalAudioContext = window.AudioContext;

class FakeAudioContext {
  static frequencies: number[] = [];
  currentTime = 0;
  destination = {};
  state = "running";

  createGain() {
    return {
      connect: vi.fn(),
      gain: {
        exponentialRampToValueAtTime: vi.fn(),
        setTargetAtTime: vi.fn(),
        setValueAtTime: vi.fn(),
      },
    };
  }

  createOscillator() {
    return {
      connect: vi.fn(),
      frequency: {
        setValueAtTime: (frequency: number) => FakeAudioContext.frequencies.push(frequency),
      },
      start: vi.fn(),
      stop: vi.fn(),
      type: "sine",
    };
  }

  close() { return Promise.resolve(); }
  resume() { return Promise.resolve(); }
}

afterEach(() => {
  FakeAudioContext.frequencies = [];
  Object.defineProperty(window, "AudioContext", { configurable: true, value: originalAudioContext });
});

describe("game audio effects", () => {
  it("plays an ascending five-note finale while respecting audio settings", async () => {
    Object.defineProperty(window, "AudioContext", {
      configurable: true,
      value: FakeAudioContext as unknown as typeof AudioContext,
    });
    const controller = new GameAudioController({ schemaVersion: 1, muted: false, volume: 55 });

    controller.playEffect("finale");

    await vi.waitFor(() => {
      expect(FakeAudioContext.frequencies).toEqual([523.25, 659.25, 783.99, 1046.5, 1318.51]);
    });
    controller.dispose();
  });
});
