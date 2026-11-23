"use client";

import { useEffect, useRef, useState } from "react";
import type { GameBridge, GameWorldSnapshot } from "../../game/bridge";
import type { MovementInput } from "../../game/world";

export type MountedGame = {
  destroy: () => void;
  setPaused: (paused: boolean) => void;
  interact: () => void;
  syncWorldState: (snapshot: GameWorldSnapshot) => void;
  setMobileInput: (input: MovementInput) => void;
};

export type GameModule = {
  mountGame: (container: HTMLDivElement, bridge: GameBridge) => MountedGame;
};

type PhaserGameHostProps = {
  bridge: GameBridge;
  loadGame?: () => Promise<GameModule>;
  paused?: boolean;
  worldSnapshot: GameWorldSnapshot;
};

const defaultLoader = () => import("../../game/runtime");

export function PhaserGameHost({ bridge, loadGame = defaultLoader, paused = false, worldSnapshot }: PhaserGameHostProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<MountedGame | null>(null);
  const pausedRef = useRef(paused);
  const worldSnapshotRef = useRef(worldSnapshot);
  const mobileInputRef = useRef<MovementInput>({ up: false, down: false, left: false, right: false });
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let active = true;
    let mountedGame: MountedGame | null = null;

    loadGame()
      .then((gameModule) => {
        if (!active || !containerRef.current) return;
        mountedGame = gameModule.mountGame(containerRef.current, bridge);
        gameRef.current = mountedGame;
        mountedGame.setPaused(pausedRef.current);
        mountedGame.syncWorldState(worldSnapshotRef.current);
        setStatus("ready");
      })
      .catch(() => {
        if (active) setStatus("error");
      });

    return () => {
      active = false;
      gameRef.current = null;
      mountedGame?.destroy();
    };
  }, [bridge, loadGame]);

  useEffect(() => {
    pausedRef.current = paused;
    gameRef.current?.setPaused(paused);
  }, [paused]);

  useEffect(() => {
    worldSnapshotRef.current = worldSnapshot;
    gameRef.current?.syncWorldState(worldSnapshot);
  }, [worldSnapshot]);

  function setMobileDirection(direction: keyof MovementInput, active: boolean) {
    const next = { ...mobileInputRef.current, [direction]: active };
    mobileInputRef.current = next;
    gameRef.current?.setMobileInput(next);
  }

  const directionButton = (direction: keyof MovementInput, label: string, symbol: string, gridClass: string) => (
    <button
      aria-label={label}
      className={`h-12 w-12 touch-none select-none rounded-xl border-2 border-[#F5C968] bg-[#0D1730]/95 text-xl font-bold shadow-xl active:bg-[#F5C968] active:text-[#0D1730] ${gridClass}`}
      onPointerCancel={() => setMobileDirection(direction, false)}
      onPointerDown={(event) => {
        event.preventDefault();
        event.currentTarget.setPointerCapture?.(event.pointerId);
        setMobileDirection(direction, true);
      }}
      onPointerUp={() => setMobileDirection(direction, false)}
      type="button"
    >
      {symbol}
    </button>
  );

  return (
    <section aria-label="평화마을 게임 화면" className="relative min-h-0 flex-1 overflow-hidden bg-[#081126]">
      <div className="h-full min-h-[420px] w-full" data-testid="phaser-game-container" ref={containerRef} />
      <div className="mobile-game-controls pointer-events-none absolute inset-x-3 bottom-3 z-20 items-end justify-between" aria-label="모바일 게임 조작">
        <div className="pointer-events-auto grid grid-cols-3 grid-rows-3 gap-1">
          {directionButton("up", "위로 이동", "▲", "col-start-2 row-start-1")}
          {directionButton("left", "왼쪽으로 이동", "◀", "col-start-1 row-start-2")}
          {directionButton("down", "아래로 이동", "▼", "col-start-2 row-start-2")}
          {directionButton("right", "오른쪽으로 이동", "▶", "col-start-3 row-start-2")}
        </div>
        <button
          aria-label="상호작용"
          className="pointer-events-auto h-16 w-16 touch-none rounded-full border-4 border-[#F5C968] bg-[#0D1730]/95 text-lg font-black shadow-xl active:bg-[#F5C968] active:text-[#0D1730]"
          onClick={() => gameRef.current?.interact()}
          type="button"
        >
          E
        </button>
      </div>
      {status === "loading" ? (
        <p className="absolute inset-0 grid place-items-center bg-[#081126] text-base font-bold text-[#F5C968]" role="status">
          평화마을을 준비하고 있습니다.
        </p>
      ) : null}
      {status === "error" ? (
        <p className="absolute inset-0 grid place-items-center bg-[#081126] px-6 text-center text-base font-bold text-rose-200" role="alert">
          게임 엔진을 불러오지 못했습니다. 페이지를 새로고침해 주세요.
        </p>
      ) : null}
      <p className="sr-only" aria-live="polite">
        {status === "ready" ? "평화마을 게임 화면이 준비되었습니다." : ""}
      </p>
    </section>
  );
}
