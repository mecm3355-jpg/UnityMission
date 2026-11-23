import type { StorageLike } from "../lib/progress-storage";
import type { CompletedMissions } from "../types/progress";

export const RPG_PROGRESS_STORAGE_KEY = "unitymission:rpg:v1";
export const PUZZLE_ORDER = ["blue", "gold", "green"] as const;
export type PuzzleStoneId = (typeof PUZZLE_ORDER)[number];

export type RpgProgress = {
  schemaVersion: 1;
  puzzleSequence: PuzzleStoneId[];
  puzzleSolved: boolean;
  harmonyKey: boolean;
  endingSeen: boolean;
  updatedAt: string;
};

export type PuzzleResult = {
  progress: RpgProgress;
  outcome: "advanced" | "reset" | "solved" | "already-solved";
};

const STONE_SET = new Set<string>(PUZZLE_ORDER);

export function createInitialRpgProgress(now = new Date().toISOString()): RpgProgress {
  return {
    schemaVersion: 1,
    puzzleSequence: [],
    puzzleSolved: false,
    harmonyKey: false,
    endingSeen: false,
    updatedAt: now,
  };
}

export function getPeaceFragmentCount(completedMissions: CompletedMissions): number {
  return Object.keys(completedMissions).length;
}

export function activatePuzzleStone(progress: RpgProgress, stoneId: PuzzleStoneId, now = new Date().toISOString()): PuzzleResult {
  if (progress.puzzleSolved) return { progress, outcome: "already-solved" };
  const expected = PUZZLE_ORDER[progress.puzzleSequence.length];
  if (stoneId !== expected) {
    const puzzleSequence: PuzzleStoneId[] = stoneId === PUZZLE_ORDER[0] ? [stoneId] : [];
    return { progress: { ...progress, puzzleSequence, updatedAt: now }, outcome: "reset" };
  }
  const puzzleSequence = [...progress.puzzleSequence, stoneId];
  const solved = puzzleSequence.length === PUZZLE_ORDER.length;
  return {
    progress: {
      ...progress,
      puzzleSequence,
      puzzleSolved: solved,
      harmonyKey: solved,
      updatedAt: now,
    },
    outcome: solved ? "solved" : "advanced",
  };
}

export function markEndingSeen(progress: RpgProgress, fragmentCount: number, now = new Date().toISOString()): RpgProgress {
  if (fragmentCount < 5) return progress;
  return { ...progress, endingSeen: true, updatedAt: now };
}

export function validateRpgProgress(value: unknown): value is RpgProgress {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  const keys = Object.keys(item);
  const expectedKeys = ["schemaVersion", "puzzleSequence", "puzzleSolved", "harmonyKey", "endingSeen", "updatedAt"];
  if (keys.length !== expectedKeys.length || !keys.every((key) => expectedKeys.includes(key))) return false;
  if (item.schemaVersion !== 1 || !Array.isArray(item.puzzleSequence)) return false;
  if (!item.puzzleSequence.every((stone) => typeof stone === "string" && STONE_SET.has(stone))) return false;
  const sequence = item.puzzleSequence as PuzzleStoneId[];
  if (sequence.length > PUZZLE_ORDER.length || sequence.some((stone, index) => stone !== PUZZLE_ORDER[index])) return false;
  if (typeof item.puzzleSolved !== "boolean" || typeof item.harmonyKey !== "boolean" || typeof item.endingSeen !== "boolean") return false;
  if (item.puzzleSolved !== item.harmonyKey) return false;
  if (item.puzzleSolved !== (sequence.length === PUZZLE_ORDER.length)) return false;
  return typeof item.updatedAt === "string" && !Number.isNaN(Date.parse(item.updatedAt));
}

export class RpgProgressStore {
  constructor(private readonly storage: StorageLike | null) {}

  load(): RpgProgress {
    if (!this.storage) return createInitialRpgProgress();
    try {
      const serialized = this.storage.getItem(RPG_PROGRESS_STORAGE_KEY);
      if (!serialized) return createInitialRpgProgress();
      const parsed: unknown = JSON.parse(serialized);
      if (validateRpgProgress(parsed)) return parsed;
      this.storage.removeItem(RPG_PROGRESS_STORAGE_KEY);
    } catch {
      try { this.storage.removeItem(RPG_PROGRESS_STORAGE_KEY); } catch { /* session fallback */ }
    }
    return createInitialRpgProgress();
  }

  save(progress: RpgProgress): void {
    if (!validateRpgProgress(progress)) throw new Error("Refusing to save invalid RPG progress.");
    try { this.storage?.setItem(RPG_PROGRESS_STORAGE_KEY, JSON.stringify(progress)); } catch { /* session fallback */ }
  }
}
