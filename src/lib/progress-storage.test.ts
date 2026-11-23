import { describe, expect, it } from "vitest";
import {
  advanceToNextQuestion,
  createInitialProgress,
  revealCurrentExplanation,
  startMissionAttempt,
  submitCurrentAnswer,
} from "./game-engine";
import {
  PROGRESS_STORAGE_KEY,
  ProgressStore,
  type StorageLike,
  validateProgressData,
} from "./progress-storage";

const CREATED_AT = "2026-11-23T09:00:00.000Z";

class MemoryStorage implements StorageLike {
  readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

class ThrowingStorage implements StorageLike {
  getItem(): string | null {
    throw new Error("blocked");
  }

  setItem(): void {
    throw new Error("blocked");
  }

  removeItem(): void {
    throw new Error("blocked");
  }
}

describe("progress data validation", () => {
  it("accepts a valid in-progress attempt", () => {
    let progress = createInitialProgress("평화별", CREATED_AT);
    progress = startMissionAttempt(progress, "mission-1", "2026-11-23T09:01:00.000Z");
    progress = submitCurrentAnswer(progress, 2, "2026-11-23T09:02:00.000Z");
    progress = revealCurrentExplanation(progress, "2026-11-23T09:03:00.000Z");
    progress = advanceToNextQuestion(progress, "2026-11-23T09:04:00.000Z");

    expect(validateProgressData(progress)).toEqual({ valid: true, progress, errors: [] });
  });

  it("rejects unknown IDs, out-of-range answers, and future question progress", () => {
    const progress = createInitialProgress("평화별", CREATED_AT) as unknown as Record<string, unknown>;
    progress.activeAttempt = {
      missionId: "mission-99",
      answers: [4, null, 1],
      revealedExplanation: [true, false, true],
      currentIndex: 0,
    };

    const validation = validateProgressData(progress);
    expect(validation.valid).toBe(false);
    if (!validation.valid) {
      expect(validation.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining("missionId is invalid"),
          expect.stringContaining("invalid answer"),
          expect.stringContaining("future progress"),
        ]),
      );
    }
  });

  it("rejects non-sequential completion records", () => {
    const progress = createInitialProgress("평화별", CREATED_AT) as unknown as Record<string, unknown>;
    progress.updatedAt = "2026-11-23T09:10:00.000Z";
    progress.completedMissions = {
      "mission-2": {
        completedAt: "2026-11-23T09:05:00.000Z",
        bestCorrectCount: 2,
        attemptCount: 1,
      },
    };

    const validation = validateProgressData(progress);
    expect(validation.valid).toBe(false);
    if (!validation.valid) {
      expect(validation.errors).toContain("mission-2 is completed without its prerequisite");
    }
  });
});

describe("local progress store", () => {
  it("saves and restores an unfinished answer state", () => {
    const storage = new MemoryStorage();
    const store = new ProgressStore(storage);
    let progress = createInitialProgress("평화별", CREATED_AT);
    progress = startMissionAttempt(progress, "mission-1", "2026-11-23T09:01:00.000Z");
    progress = submitCurrentAnswer(progress, 2, "2026-11-23T09:02:00.000Z");

    expect(store.save(progress)).toEqual({ persisted: true, warning: null });

    const restored = new ProgressStore(storage).load();
    expect(restored).toEqual({
      progress,
      persistenceAvailable: true,
      warning: null,
    });
  });

  it("resets malformed JSON without crashing and returns a warning", () => {
    const storage = new MemoryStorage();
    storage.values.set(PROGRESS_STORAGE_KEY, "{not-json");

    const result = new ProgressStore(storage).load();
    expect(result.progress).toBeNull();
    expect(result.warning?.code).toBe("corrupt-data-reset");
    expect(storage.getItem(PROGRESS_STORAGE_KEY)).toBeNull();
  });

  it("resets structurally invalid stored data", () => {
    const storage = new MemoryStorage();
    storage.values.set(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({ schemaVersion: 1, nickname: "<script>alert(1)</script>" }),
    );

    const result = new ProgressStore(storage).load();
    expect(result.progress).toBeNull();
    expect(result.warning?.code).toBe("corrupt-data-reset");
  });

  it("keeps session progress when persistent storage is unavailable", () => {
    const store = new ProgressStore(new ThrowingStorage());
    const progress = createInitialProgress("평화별", CREATED_AT);

    const saved = store.save(progress);
    expect(saved.persisted).toBe(false);
    expect(saved.warning?.code).toBe("storage-unavailable");
    expect(store.getSessionProgress()).toEqual(progress);

    const loaded = store.load();
    expect(loaded.progress).toEqual(progress);
    expect(loaded.persistenceAvailable).toBe(false);
  });

  it("works in memory when no storage object exists", () => {
    const store = new ProgressStore(null);
    const progress = createInitialProgress("평화별", CREATED_AT);

    expect(store.save(progress).persisted).toBe(false);
    expect(store.load().progress).toEqual(progress);
  });

  it("refuses to save an invalid progress object", () => {
    const store = new ProgressStore(new MemoryStorage());
    const invalid = {
      ...createInitialProgress("평화별", CREATED_AT),
      schemaVersion: 2,
    } as unknown as Parameters<ProgressStore["save"]>[0];

    expect(() => store.save(invalid)).toThrow("Refusing to save invalid progress");
  });

  it("clears both persistent and session progress", () => {
    const storage = new MemoryStorage();
    const store = new ProgressStore(storage);
    const progress = createInitialProgress("평화별", CREATED_AT);
    store.save(progress);

    expect(store.clear()).toEqual({ persisted: true, warning: null });
    expect(store.getSessionProgress()).toBeNull();
    expect(storage.getItem(PROGRESS_STORAGE_KEY)).toBeNull();
  });
});
