import { describe, expect, it } from "vitest";
import type { StorageLike } from "../lib/progress-storage";
import {
  RPG_PROGRESS_STORAGE_KEY,
  RpgProgressStore,
  activatePuzzleStone,
  createInitialRpgProgress,
  getPeaceFragmentCount,
  markEndingSeen,
} from "./rpg-progress";

class MemoryStorage implements StorageLike {
  private readonly values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

describe("R06 RPG progress", () => {
  it("derives fragments only from the shared mission completion ledger", () => {
    expect(getPeaceFragmentCount({})).toBe(0);
    expect(getPeaceFragmentCount({ "mission-1": { completedAt: "2026-11-23T00:00:00.000Z", bestCorrectCount: 3, attemptCount: 1 } })).toBe(1);
  });

  it("solves blue-gold-green and never duplicates the harmony key", () => {
    let progress = createInitialRpgProgress("2026-11-23T00:00:00.000Z");
    expect(activatePuzzleStone(progress, "gold").outcome).toBe("reset");
    for (const stone of ["blue", "gold", "green"] as const) progress = activatePuzzleStone(progress, stone).progress;
    expect(progress).toMatchObject({ puzzleSequence: ["blue", "gold", "green"], puzzleSolved: true, harmonyKey: true });
    expect(activatePuzzleStone(progress, "blue")).toEqual({ progress, outcome: "already-solved" });
  });

  it("rejects corrupt local data and gates the ending to five fragments", () => {
    const storage = new MemoryStorage();
    storage.setItem(RPG_PROGRESS_STORAGE_KEY, JSON.stringify({ schemaVersion: 1, harmonyKey: "yes" }));
    const store = new RpgProgressStore(storage);
    const reset = store.load();
    expect(reset.puzzleSequence).toEqual([]);
    expect(storage.getItem(RPG_PROGRESS_STORAGE_KEY)).toBeNull();
    expect(markEndingSeen(reset, 4)).toBe(reset);
    const complete = markEndingSeen(reset, 5);
    expect(complete.endingSeen).toBe(true);
    store.save(complete);
    expect(new RpgProgressStore(storage).load().endingSeen).toBe(true);
  });
});
