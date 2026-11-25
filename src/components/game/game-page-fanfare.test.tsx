// @vitest-environment jsdom

import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getMissionById } from "../../content/missions";
import { ProgressProvider } from "../../context/progress-context";
import type { GameBridge } from "../../game/bridge";
import {
  advanceToNextQuestion,
  completeActiveAttempt,
  createInitialProgress,
  revealCurrentExplanation,
  startMissionAttempt,
  submitCurrentAnswer,
} from "../../lib/game-engine";
import { PROGRESS_STORAGE_KEY } from "../../lib/progress-storage";
import { MISSION_IDS, type MissionId } from "../../types/content";
import type { UnityMissionProgress } from "../../types/progress";
import { GamePage } from "./game-page";
import type { GameModule } from "./phaser-game-host";

const audioMocks = vi.hoisted(() => ({
  playEffect: vi.fn(),
  setMuted: vi.fn(),
  setRegion: vi.fn(),
  setVolume: vi.fn(),
}));

vi.mock("../../game/use-game-audio", () => ({
  useGameAudio: () => ({
    ...audioMocks,
    settings: { schemaVersion: 1, muted: false, volume: 55 },
  }),
}));

function completeMissionForSetup(progress: UnityMissionProgress, missionId: MissionId, startMinute: number) {
  const mission = getMissionById(missionId);
  if (!mission) throw new Error("Test mission not found");
  const timestamp = (offset: number) => new Date(Date.parse("2026-11-23T09:00:00.000Z") + (startMinute + offset) * 60_000).toISOString();
  let next = startMissionAttempt(progress, missionId, timestamp(0));
  mission.questions.forEach((question, index) => {
    next = submitCurrentAnswer(next, question.correctIndex, timestamp(index * 3 + 1));
    next = revealCurrentExplanation(next, timestamp(index * 3 + 2));
    if (index < 2) next = advanceToNextQuestion(next, timestamp(index * 3 + 3));
  });
  return completeActiveAttempt(next, timestamp(10)).progress;
}

function createGameLoader(onBridge: (bridge: GameBridge) => void): () => Promise<GameModule> {
  return async () => ({
    mountGame: (_container, bridge) => {
      onBridge(bridge);
      return {
        destroy: vi.fn(),
        interact: vi.fn(),
        setMobileInput: vi.fn(),
        setPaused: vi.fn(),
        syncWorldState: vi.fn(),
      };
    },
  });
}

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  vi.clearAllMocks();
});

describe("peace tree finale fanfare", () => {
  it("plays the finale when the completed player opens the ending at the peace tree", async () => {
    let progress = createInitialProgress("완주별", "2026-11-23T09:00:00.000Z");
    MISSION_IDS.forEach((missionId, index) => {
      progress = completeMissionForSetup(progress, missionId, index * 20 + 1);
    });
    window.localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
    let bridge: GameBridge | null = null;
    render(<ProgressProvider><GamePage gameLoader={createGameLoader((nextBridge) => { bridge = nextBridge; })} /></ProgressProvider>);
    await screen.findByText("평화마을 게임 화면이 준비되었습니다.");

    act(() => bridge?.onWorldInteract("peace-tree"));

    expect(audioMocks.playEffect).toHaveBeenCalledTimes(1);
    expect(audioMocks.playEffect).toHaveBeenCalledWith("finale");
    expect(await screen.findByRole("heading", { name: "평화마을이 다시 빛납니다" })).toBeTruthy();
  });

  it("does not play the finale when fragments are missing", async () => {
    const progress = createInitialProgress("진행별", "2026-11-23T09:00:00.000Z");
    window.localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
    let bridge: GameBridge | null = null;
    render(<ProgressProvider><GamePage gameLoader={createGameLoader((nextBridge) => { bridge = nextBridge; })} /></ProgressProvider>);
    await screen.findByText("평화마을 게임 화면이 준비되었습니다.");

    act(() => bridge?.onWorldInteract("peace-tree"));

    expect(audioMocks.playEffect).not.toHaveBeenCalled();
    expect(await screen.findByText("평화의 나무를 깨우려면 조각 5개가 더 필요합니다.")).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "평화마을이 다시 빛납니다" })).toBeNull();
  });
});
