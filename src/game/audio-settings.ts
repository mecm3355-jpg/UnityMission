import type { StorageLike } from "../lib/progress-storage";

export const GAME_AUDIO_STORAGE_KEY = "unitymission:audio:v1";

export type GameAudioSettings = {
  schemaVersion: 1;
  muted: boolean;
  volume: number;
};

export const DEFAULT_GAME_AUDIO_SETTINGS: GameAudioSettings = {
  schemaVersion: 1,
  muted: false,
  volume: 55,
};

export function validateGameAudioSettings(value: unknown): value is GameAudioSettings {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  const keys = Object.keys(item);
  return keys.length === 3
    && keys.every((key) => ["schemaVersion", "muted", "volume"].includes(key))
    && item.schemaVersion === 1
    && typeof item.muted === "boolean"
    && typeof item.volume === "number"
    && Number.isInteger(item.volume)
    && item.volume >= 0
    && item.volume <= 100;
}

export class GameAudioSettingsStore {
  constructor(private readonly storage: StorageLike | null) {}

  load(): GameAudioSettings {
    if (!this.storage) return DEFAULT_GAME_AUDIO_SETTINGS;
    try {
      const serialized = this.storage.getItem(GAME_AUDIO_STORAGE_KEY);
      if (!serialized) return DEFAULT_GAME_AUDIO_SETTINGS;
      const parsed: unknown = JSON.parse(serialized);
      if (validateGameAudioSettings(parsed)) return parsed;
      this.storage.removeItem(GAME_AUDIO_STORAGE_KEY);
    } catch {
      try { this.storage.removeItem(GAME_AUDIO_STORAGE_KEY); } catch { /* session fallback */ }
    }
    return DEFAULT_GAME_AUDIO_SETTINGS;
  }

  save(settings: GameAudioSettings): void {
    if (!validateGameAudioSettings(settings)) throw new Error("Refusing to save invalid audio settings.");
    try { this.storage?.setItem(GAME_AUDIO_STORAGE_KEY, JSON.stringify(settings)); } catch { /* session fallback */ }
  }
}
