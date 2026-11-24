import { describe, expect, it } from "vitest";
import {
  DEFAULT_GAME_AUDIO_SETTINGS,
  GAME_AUDIO_STORAGE_KEY,
  GameAudioSettingsStore,
  validateGameAudioSettings,
} from "./audio-settings";

class MemoryStorage {
  private readonly values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

describe("game audio settings", () => {
  it("accepts only the bounded v1 settings shape", () => {
    expect(validateGameAudioSettings({ schemaVersion: 1, muted: true, volume: 40 })).toBe(true);
    expect(validateGameAudioSettings({ schemaVersion: 1, muted: false, volume: 101 })).toBe(false);
    expect(validateGameAudioSettings({ schemaVersion: 1, muted: false, volume: 40, extra: true })).toBe(false);
  });

  it("saves and restores mute and volume", () => {
    const storage = new MemoryStorage();
    const store = new GameAudioSettingsStore(storage);
    store.save({ schemaVersion: 1, muted: true, volume: 32 });
    expect(store.load()).toEqual({ schemaVersion: 1, muted: true, volume: 32 });
  });

  it("removes untrusted data and falls back safely", () => {
    const storage = new MemoryStorage();
    storage.setItem(GAME_AUDIO_STORAGE_KEY, JSON.stringify({ schemaVersion: 1, muted: "no", volume: -1 }));
    expect(new GameAudioSettingsStore(storage).load()).toEqual(DEFAULT_GAME_AUDIO_SETTINGS);
    expect(storage.getItem(GAME_AUDIO_STORAGE_KEY)).toBeNull();
  });
});
