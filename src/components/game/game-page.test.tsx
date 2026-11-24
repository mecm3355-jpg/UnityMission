// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createInitialProgress } from "../../lib/game-engine";
import { PROGRESS_STORAGE_KEY } from "../../lib/progress-storage";
import { ProgressProvider } from "../../context/progress-context";
import { GamePage } from "./game-page";
import { PhaserGameHost, type GameModule } from "./phaser-game-host";
import type { GameBridge } from "../../game/bridge";
import { GAME_AUDIO_STORAGE_KEY } from "../../game/audio-settings";

const bridge: GameBridge = {
  onNearbyNpcChange: vi.fn(),
  onNpcInteract: vi.fn(),
  onNearbyWorldInteractionChange: vi.fn(),
  onWorldInteract: vi.fn(),
};
const worldSnapshot = { fragmentCount: 0, puzzleSequence: [], puzzleSolved: false };

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("R02 Phaser game host", () => {
  it("guards the game when a dashboard profile does not exist", async () => {
    render(
      <ProgressProvider>
        <GamePage />
      </ProgressProvider>,
    );

    expect(await screen.findByRole("heading", { name: "모험 기록이 필요합니다." })).toBeTruthy();
    expect(screen.getByRole("link", { name: "닉네임 만들기" })).toHaveProperty("pathname", "/");
  });

  it("mounts the client game after loading and destroys it on unmount", async () => {
    const destroy = vi.fn();
    const setPaused = vi.fn();
    const syncWorldState = vi.fn();
    const setMobileInput = vi.fn();
    const interact = vi.fn();
    const mountGame = vi.fn(() => ({ destroy, setPaused, interact, setMobileInput, syncWorldState }));
    const loadGame = vi.fn(async (): Promise<GameModule> => ({ mountGame }));
    const { rerender, unmount } = render(<PhaserGameHost bridge={bridge} loadGame={loadGame} worldSnapshot={worldSnapshot} />);

    await screen.findByText("평화마을 게임 화면이 준비되었습니다.");
    expect(loadGame).toHaveBeenCalledTimes(1);
    expect(mountGame).toHaveBeenCalledWith(screen.getByTestId("phaser-game-container"), bridge);
    expect(setPaused).toHaveBeenCalledWith(false);
    expect(syncWorldState).toHaveBeenCalledWith(worldSnapshot);

    rerender(<PhaserGameHost bridge={bridge} loadGame={loadGame} paused worldSnapshot={{ ...worldSnapshot, fragmentCount: 1 }} />);
    expect(setPaused).toHaveBeenLastCalledWith(true);
    expect(syncWorldState).toHaveBeenLastCalledWith({ ...worldSnapshot, fragmentCount: 1 });

    fireEvent.pointerDown(screen.getByRole("button", { name: "오른쪽으로 이동" }), { pointerId: 1 });
    expect(setMobileInput).toHaveBeenLastCalledWith({ up: false, down: false, left: false, right: true });
    fireEvent.pointerUp(screen.getByRole("button", { name: "오른쪽으로 이동" }), { pointerId: 1 });
    expect(setMobileInput).toHaveBeenLastCalledWith({ up: false, down: false, left: false, right: false });
    fireEvent.click(screen.getByRole("button", { name: "상호작용" }));
    expect(interact).toHaveBeenCalledTimes(1);

    unmount();
    expect(destroy).toHaveBeenCalledTimes(1);
  });

  it("renders the existing profile and shared XP in the game header", async () => {
    const progress = createInitialProgress("평화별", "2026-11-23T09:00:00.000Z");
    window.localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));

    const loadGame = async (): Promise<GameModule> => ({
      mountGame: () => ({ destroy: vi.fn(), setPaused: vi.fn(), interact: vi.fn(), setMobileInput: vi.fn(), syncWorldState: vi.fn() }),
    });
    render(
      <ProgressProvider>
        <GamePage gameLoader={loadGame} />
      </ProgressProvider>,
    );

    expect(await screen.findByRole("heading", { name: "평화별의 평화마을" })).toBeTruthy();
    expect(screen.getByText("Lv.1 · 0XP")).toBeTruthy();
    expect(screen.getByRole("link", { name: "대시보드" })).toHaveProperty("pathname", "/dashboard");
    expect(screen.getByRole("heading", { name: "역사 안내자를 찾아가세요" })).toBeTruthy();

    await waitFor(() => expect(screen.getByLabelText("평화마을 게임 화면")).toBeTruthy());
  });

  it("persists accessible mute and volume controls without changing progress", async () => {
    const progress = createInitialProgress("소리별", "2026-11-23T09:00:00.000Z");
    window.localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
    const loadGame = async (): Promise<GameModule> => ({
      mountGame: () => ({ destroy: vi.fn(), setPaused: vi.fn(), interact: vi.fn(), setMobileInput: vi.fn(), syncWorldState: vi.fn() }),
    });
    render(
      <ProgressProvider>
        <GamePage gameLoader={loadGame} />
      </ProgressProvider>,
    );

    await screen.findByRole("heading", { name: "소리별의 평화마을" });
    fireEvent.change(screen.getByRole("slider", { name: "게임 음량" }), { target: { value: "32" } });
    fireEvent.click(screen.getByRole("button", { name: "게임 소리 끄기" }));

    expect(JSON.parse(window.localStorage.getItem(GAME_AUDIO_STORAGE_KEY) ?? "null")).toEqual({
      schemaVersion: 1,
      muted: true,
      volume: 32,
    });
    expect(JSON.parse(window.localStorage.getItem(PROGRESS_STORAGE_KEY) ?? "null")).toEqual(progress);
  });
});
