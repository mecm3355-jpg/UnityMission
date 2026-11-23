"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  RpgProgressStore,
  activatePuzzleStone,
  createInitialRpgProgress,
  markEndingSeen,
  type PuzzleResult,
  type PuzzleStoneId,
  type RpgProgress,
} from "./rpg-progress";

export function useRpgProgress() {
  const storeRef = useRef<RpgProgressStore | null>(null);
  const stateRef = useRef<RpgProgress>(createInitialRpgProgress());
  const [progress, setProgress] = useState<RpgProgress>(() => createInitialRpgProgress());
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const store = new RpgProgressStore(window.localStorage);
    const restored = store.load();
    storeRef.current = store;
    stateRef.current = restored;
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setProgress(restored);
      setIsHydrated(true);
    });
    return () => { active = false; };
  }, []);

  const save = useCallback((next: RpgProgress) => {
    stateRef.current = next;
    setProgress(next);
    storeRef.current?.save(next);
  }, []);

  const activateStone = useCallback((stoneId: PuzzleStoneId): PuzzleResult => {
    const result = activatePuzzleStone(stateRef.current, stoneId);
    save(result.progress);
    return result;
  }, [save]);

  const seeEnding = useCallback((fragmentCount: number) => {
    const next = markEndingSeen(stateRef.current, fragmentCount);
    save(next);
    return next.endingSeen;
  }, [save]);

  return { activateStone, isHydrated, progress, seeEnding };
}
