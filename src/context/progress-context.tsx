"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  advanceToNextQuestion,
  completeActiveAttempt,
  createInitialProgress,
  revealCurrentExplanation,
  startMissionAttempt,
  submitCurrentAnswer,
  type CompletionResult,
} from "../lib/game-engine";
import {
  ProgressStore,
  type StorageLike,
  type StorageWarning,
} from "../lib/progress-storage";
import type { UnityMissionProgress } from "../types/progress";

type ProgressContextValue = {
  isHydrated: boolean;
  progress: UnityMissionProgress | null;
  lastCompletion: CompletionResult | null;
  warning: StorageWarning | null;
  startNewProgress: (nickname: string) => UnityMissionProgress;
  saveProgress: (progress: UnityMissionProgress) => void;
  beginMission: (missionId: string) => UnityMissionProgress;
  selectAnswer: (answerIndex: number) => UnityMissionProgress;
  revealAnswer: () => UnityMissionProgress;
  advanceQuestion: () => UnityMissionProgress;
  completeMission: () => CompletionResult;
  clearProgress: () => void;
};

const ProgressContext = createContext<ProgressContextValue | null>(null);

function getBrowserStorage(): StorageLike | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function ProgressProvider({ children }: { children: ReactNode }) {
  const storeRef = useRef<ProgressStore | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [progress, setProgress] = useState<UnityMissionProgress | null>(null);
  const [lastCompletion, setLastCompletion] = useState<CompletionResult | null>(null);
  const [warning, setWarning] = useState<StorageWarning | null>(null);

  useEffect(() => {
    if (storeRef.current) {
      return;
    }

    const store = new ProgressStore(getBrowserStorage());
    const restored = store.load();
    storeRef.current = store;
    setProgress(restored.progress);
    setWarning(restored.warning);
    setIsHydrated(true);
  }, []);

  const saveProgress = useCallback((nextProgress: UnityMissionProgress) => {
    const store = storeRef.current;
    if (!store) {
      throw new Error("Progress storage is not ready.");
    }

    const result = store.save(nextProgress);
    setProgress(nextProgress);
    setWarning(result.warning);
  }, []);

  const startNewProgress = useCallback(
    (nickname: string) => {
      const nextProgress = createInitialProgress(nickname, new Date().toISOString());
      setLastCompletion(null);
      saveProgress(nextProgress);
      return nextProgress;
    },
    [saveProgress],
  );

  const beginMission = useCallback(
    (missionId: string) => {
      if (!progress) {
        throw new Error("A progress profile is required.");
      }

      const nextProgress = startMissionAttempt(progress, missionId, new Date().toISOString());
      setLastCompletion(null);
      saveProgress(nextProgress);
      return nextProgress;
    },
    [progress, saveProgress],
  );

  const selectAnswer = useCallback(
    (answerIndex: number) => {
      if (!progress) {
        throw new Error("A progress profile is required.");
      }

      const nextProgress = submitCurrentAnswer(progress, answerIndex, new Date().toISOString());
      saveProgress(nextProgress);
      return nextProgress;
    },
    [progress, saveProgress],
  );

  const revealAnswer = useCallback(() => {
    if (!progress) {
      throw new Error("A progress profile is required.");
    }

    const nextProgress = revealCurrentExplanation(progress, new Date().toISOString());
    saveProgress(nextProgress);
    return nextProgress;
  }, [progress, saveProgress]);

  const advanceQuestion = useCallback(() => {
    if (!progress) {
      throw new Error("A progress profile is required.");
    }

    const nextProgress = advanceToNextQuestion(progress, new Date().toISOString());
    saveProgress(nextProgress);
    return nextProgress;
  }, [progress, saveProgress]);

  const completeMission = useCallback(() => {
    if (!progress) {
      throw new Error("A progress profile is required.");
    }

    const result = completeActiveAttempt(progress, new Date().toISOString());
    setLastCompletion(result);
    saveProgress(result.progress);
    return result;
  }, [progress, saveProgress]);

  const clearProgress = useCallback(() => {
    const store = storeRef.current;
    if (!store) {
      throw new Error("Progress storage is not ready.");
    }

    const result = store.clear();
    setProgress(null);
    setLastCompletion(null);
    setWarning(result.warning);
  }, []);

  const value = useMemo<ProgressContextValue>(
    () => ({
      isHydrated,
      progress,
      lastCompletion,
      warning,
      startNewProgress,
      saveProgress,
      beginMission,
      selectAnswer,
      revealAnswer,
      advanceQuestion,
      completeMission,
      clearProgress,
    }),
    [
      advanceQuestion,
      beginMission,
      clearProgress,
      completeMission,
      isHydrated,
      lastCompletion,
      progress,
      revealAnswer,
      saveProgress,
      selectAnswer,
      startNewProgress,
      warning,
    ],
  );

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress(): ProgressContextValue {
  const context = useContext(ProgressContext);
  if (!context) {
    throw new Error("useProgress must be used within ProgressProvider.");
  }

  return context;
}
