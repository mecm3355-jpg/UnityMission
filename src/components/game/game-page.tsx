"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getLevelSummary } from "../../lib/game-engine";
import { useProgress } from "../../context/progress-context";
import { getNpcById, type NpcId } from "../../game/npcs";
import type { GameBridge } from "../../game/bridge";
import { getPeaceFragmentCount, type PuzzleStoneId } from "../../game/rpg-progress";
import { useRpgProgress } from "../../game/use-rpg-progress";
import { WORLD_INTERACTIONS, type WorldInteractionId } from "../../game/world-interactions";
import type { MissionId } from "../../types/content";
import { DialoguePanel } from "./dialogue-panel";
import { PhaserGameHost, type GameModule } from "./phaser-game-host";
import { RpgQuestPanel } from "./rpg-quest-panel";
import { RpgHud } from "./rpg-hud";
import { EndingPanel } from "./ending-panel";

export function GamePage({ gameLoader }: { gameLoader?: () => Promise<GameModule> } = {}) {
  const { beginMission, isHydrated, progress } = useProgress();
  const [nearbyNpcId, setNearbyNpcId] = useState<NpcId | null>(null);
  const [dialogueNpcId, setDialogueNpcId] = useState<NpcId | null>(null);
  const [questMissionId, setQuestMissionId] = useState<MissionId | null>(null);
  const [nearbyWorldId, setNearbyWorldId] = useState<WorldInteractionId | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [endingOpen, setEndingOpen] = useState(false);
  const { activateStone, progress: rpgProgress, seeEnding } = useRpgProgress();
  const fragmentCount = getPeaceFragmentCount(progress?.completedMissions ?? {});
  const fragmentCountRef = useRef(fragmentCount);

  useEffect(() => {
    fragmentCountRef.current = fragmentCount;
  }, [fragmentCount]);

  const handleWorldInteract = useCallback((interactionId: WorldInteractionId) => {
    if (interactionId === "peace-tree") {
      if (fragmentCountRef.current === 5 && seeEnding(fragmentCountRef.current)) {
        setEndingOpen(true);
        setFeedback(null);
      } else {
        setFeedback(`평화의 나무를 깨우려면 조각 ${5 - fragmentCountRef.current}개가 더 필요합니다.`);
      }
      return;
    }
    const result = activateStone(interactionId as PuzzleStoneId);
    const messages = {
      advanced: "공명석이 빛났습니다. 다음 색을 찾아보세요.",
      reset: "공명이 흐트러졌습니다. 푸른색부터 다시 시작하세요.",
      solved: "환경 퍼즐 완료! 조화의 열쇠를 획득했습니다.",
      "already-solved": "세 공명석이 이미 완벽하게 조화를 이루고 있습니다.",
    } as const;
    setFeedback(messages[result.outcome]);
  }, [activateStone, seeEnding]);

  const bridge = useMemo<GameBridge>(
    () => ({
      onNearbyNpcChange: setNearbyNpcId,
      onNpcInteract: setDialogueNpcId,
      onNearbyWorldInteractionChange: setNearbyWorldId,
      onWorldInteract: handleWorldInteract,
    }),
    [handleWorldInteract],
  );

  if (!isHydrated) {
    return (
      <main className="grid min-h-screen place-items-center px-5">
        <p className="text-lg text-slate-300" role="status">
          저장된 모험 기록을 확인하고 있습니다.
        </p>
      </main>
    );
  }

  if (!progress) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-5 py-12 sm:px-8">
        <p className="text-sm font-bold tracking-[0.22em] text-[#F5C968]">UNITYMISSION RPG</p>
        <h1 className="mt-4 text-4xl font-bold">모험 기록이 필요합니다.</h1>
        <p className="mt-4 text-lg leading-8 text-slate-300">
          기존 시작 화면에서 닉네임을 만든 뒤 평화마을에 입장해 주세요.
        </p>
        <Link className="mt-8 w-fit rounded-xl bg-[#F5C968] px-5 py-3 font-bold text-[#0D1730]" href="/">
          닉네임 만들기
        </Link>
      </main>
    );
  }

  const level = getLevelSummary(progress);
  const nearbyNpc = nearbyNpcId ? getNpcById(nearbyNpcId) : undefined;
  const dialogueNpc = dialogueNpcId ? getNpcById(dialogueNpcId) : undefined;
  const nearbyWorld = nearbyWorldId ? WORLD_INTERACTIONS.find((item) => item.id === nearbyWorldId) : undefined;
  const worldSnapshot = {
    fragmentCount,
    puzzleSequence: rpgProgress.puzzleSequence,
    puzzleSolved: rpgProgress.puzzleSolved,
  };
  const startQuest = (missionId: MissionId) => {
    if (progress.activeAttempt?.missionId !== missionId) beginMission(missionId);
    setDialogueNpcId(null);
    setQuestMissionId(missionId);
  };

  return (
    <main className="game-shell flex min-h-screen flex-col bg-[#081126]" data-visual-theme="pixel-polished-v1">
      <header className="game-topbar z-10 flex flex-nowrap items-center justify-between gap-2 px-2 py-2 sm:gap-3 sm:px-6 sm:py-3">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <span aria-hidden="true" className="game-crest">◆</span>
          <div className="min-w-0">
            <p className="hidden text-[11px] font-black tracking-[0.22em] text-[#F9D873] sm:block">UNITYMISSION · 평화의 다섯 조각</p>
            <h1 className="truncate text-sm font-black sm:mt-1 sm:text-lg">{progress.nickname}의 평화마을</h1>
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm font-semibold">
          <span className="game-status-chip whitespace-nowrap text-[11px] text-[#F9D873] sm:text-sm">Lv.{level.level} · {level.xp}XP</span>
          <Link className="pixel-button hidden px-3 py-2 sm:inline-flex" href="/dashboard">
            대시보드
          </Link>
        </div>
      </header>
      <div className="relative min-h-0 flex flex-1">
        <PhaserGameHost
          bridge={bridge}
          loadGame={gameLoader}
          paused={dialogueNpc !== undefined || questMissionId !== null || endingOpen}
          worldSnapshot={worldSnapshot}
        />
        <RpgHud fragmentCount={fragmentCount} progress={rpgProgress} />
        {nearbyNpc && !dialogueNpc && !questMissionId ? (
          <p className="interaction-prompt pointer-events-none absolute bottom-44 left-1/2 z-20 -translate-x-1/2 px-5 py-3 text-center text-sm font-bold sm:bottom-5" role="status">
            <kbd>E</kbd> 키: {nearbyNpc.role}와 대화하기
          </p>
        ) : null}
        {nearbyWorld && !nearbyNpc && !dialogueNpc && !questMissionId && !endingOpen ? (
          <p className="interaction-prompt pointer-events-none absolute bottom-44 left-1/2 z-20 -translate-x-1/2 px-5 py-3 text-center text-sm font-bold sm:bottom-5" role="status">
            <kbd>E</kbd> 키: {nearbyWorld.label} 상호작용
          </p>
        ) : null}
        {feedback && !dialogueNpc && !questMissionId && !endingOpen ? (
          <p className="game-toast absolute left-1/2 top-5 z-20 w-[min(90%,36rem)] -translate-x-1/2 px-4 py-3 text-center text-sm font-semibold" role="status">
            {feedback}
          </p>
        ) : null}
        {dialogueNpc ? (
          <DialoguePanel
            completedMissions={progress.completedMissions}
            npc={dialogueNpc}
            onClose={() => setDialogueNpcId(null)}
            onStartQuest={startQuest}
            playerName={progress.nickname}
          />
        ) : null}
        {questMissionId ? <RpgQuestPanel missionId={questMissionId} onClose={() => setQuestMissionId(null)} /> : null}
        {endingOpen ? <EndingPanel level={level.level} nickname={progress.nickname} onClose={() => setEndingOpen(false)} /> : null}
      </div>
    </main>
  );
}
