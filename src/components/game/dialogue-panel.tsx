"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import {
  getNpcDialogueTurns,
  getNpcQuestState,
  type DialogueTurn,
  type NpcDefinition,
} from "../../game/npcs";
import type { MissionId } from "../../types/content";
import type { CompletedMissions } from "../../types/progress";

type DialoguePanelProps = {
  npc: NpcDefinition;
  playerName: string;
  completedMissions: CompletedMissions;
  onClose: () => void;
  onStartQuest?: (missionId: MissionId) => void;
};

const PLAYER_PORTRAIT = "/game-assets/player-dialogue-portrait-v1.png";

export function DialoguePanel({ npc, playerName, completedMissions, onClose, onStartQuest }: DialoguePanelProps) {
  const [choice, setChoice] = useState<"accept" | "later" | null>(null);
  const [turnIndex, setTurnIndex] = useState(0);
  const [typedText, setTypedText] = useState({ text: "", length: 0 });
  const [revealedText, setRevealedText] = useState<string | null>(null);
  const panelRef = useRef<HTMLElement>(null);
  const reduceMotion = typeof window !== "undefined"
    && (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false);
  const state = getNpcQuestState(npc, completedMissions);
  const turns = getNpcDialogueTurns(npc, completedMissions, playerName);
  const choiceTurn: DialogueTurn | null = choice
    ? {
        speaker: "npc",
        text: choice === "accept"
          ? "좋아요. 평화 조각이 기다리고 있어요. 준비가 되면 바로 출발하죠!"
          : "천천히 둘러보고 다시 찾아오세요. 저는 여기에서 기다릴게요.",
      }
    : null;
  const activeTurn = choiceTurn ?? turns[turnIndex];
  const activeName = activeTurn.speaker === "npc" ? npc.name : playerName;
  const activeRole = activeTurn.speaker === "npc" ? npc.role : "평화 탐험가";
  const textFinished = reduceMotion
    || revealedText === activeTurn.text
    || (typedText.text === activeTurn.text && typedText.length >= activeTurn.text.length);
  const displayedText = textFinished
    ? activeTurn.text
    : typedText.text === activeTurn.text
      ? activeTurn.text.slice(0, typedText.length)
      : "";
  const finalBaseTurn = turnIndex === turns.length - 1;

  useEffect(() => {
    panelRef.current?.focus();
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  useEffect(() => {
    if (reduceMotion) return;
    let length = 0;
    const timer = window.setInterval(() => {
      length += 1;
      setTypedText({ text: activeTurn.text, length });
      if (length >= activeTurn.text.length) window.clearInterval(timer);
    }, 24);
    return () => window.clearInterval(timer);
  }, [activeTurn.text, reduceMotion]);

  function advanceDialogue() {
    if (!textFinished) {
      setRevealedText(activeTurn.text);
      return;
    }
    if (choice === "accept" && onStartQuest) {
      onStartQuest(npc.missionId);
      return;
    }
    if (choice === "later" || (finalBaseTurn && state !== "available")) {
      onClose();
      return;
    }
    if (!finalBaseTurn) setTurnIndex((value) => value + 1);
  }

  const showChoices = state === "available" && finalBaseTurn && !choice && textFinished;
  const showAdvance = !showChoices;
  const advanceLabel = !textFinished
    ? "대사 모두 보기"
    : choice === "accept"
      ? "퀘스트 시작"
      : choice === "later" || (finalBaseTurn && state !== "available")
        ? "대화 마치기"
        : "다음";

  return (
    <div className="dialogue-backdrop absolute inset-0 z-30 flex items-end p-3 sm:p-6" role="presentation">
      <section
        aria-labelledby="dialogue-name"
        aria-modal="true"
        className={`game-panel dialogue-panel dialogue-cutscene mx-auto w-full max-w-4xl p-4 sm:p-6 speaker-${activeTurn.speaker}`}
        ref={panelRef}
        role="dialog"
        tabIndex={-1}
      >
        <button aria-label="대화 닫기" className="dialogue-close" onClick={onClose} type="button">×</button>

        <div className="dialogue-stage">
          <div className={`dialogue-cast-card npc-cast ${activeTurn.speaker === "npc" ? "is-speaking" : ""}`} aria-hidden="true">
            <div className="npc-portrait" style={{ "--npc-color": `#${npc.color.toString(16).padStart(6, "0")}` } as CSSProperties}>
              <span>{npc.name.slice(0, 1)}</span>
            </div>
            <span className="dialogue-cast-name">{npc.name}</span>
          </div>

          <div className={`dialogue-balloon ${activeTurn.speaker === "player" ? "from-player" : "from-npc"}`}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-[11px] font-black tracking-[0.16em] text-[#F9D873]">{activeRole}</p>
                <h2 className="mt-1 text-xl font-black sm:text-2xl" id="dialogue-name">{activeName}</h2>
              </div>
              {!choice ? <span className="dialogue-turn-count">{turnIndex + 1} / {turns.length}</span> : null}
            </div>
            <p aria-hidden="true" className="dialogue-line mt-3 min-h-[3.5rem] text-base leading-7 text-slate-100">
              {displayedText}<span className={textFinished ? "dialogue-cursor is-finished" : "dialogue-cursor"}>▮</span>
            </p>
            <p aria-live="polite" className="sr-only" role="status">{activeTurn.text}</p>
          </div>

          <div className={`dialogue-cast-card player-cast ${activeTurn.speaker === "player" ? "is-speaking" : ""}`} aria-hidden="true">
            <div className="player-dialogue-portrait">
              <Image alt="" height={128} priority src={PLAYER_PORTRAIT} width={128} />
            </div>
            <span className="dialogue-cast-name">{playerName}</span>
          </div>
        </div>

        {showChoices ? (
          <div className="mt-4 grid gap-3 sm:ml-[8.5rem] sm:mr-[8.5rem] sm:grid-cols-2" aria-label="대화 선택지" role="group">
            <button className="pixel-button is-primary px-4 py-3 font-black" onClick={() => setChoice("accept")} type="button">
              퀘스트를 도울게요
            </button>
            <button className="pixel-button px-4 py-3 font-semibold" onClick={() => setChoice("later")} type="button">
              조금 더 둘러볼게요
            </button>
          </div>
        ) : null}

        {showAdvance ? (
          <div className="mt-4 flex items-center justify-between gap-3 sm:ml-[8.5rem] sm:mr-[8.5rem]">
            <p className="hidden text-xs text-slate-400 sm:block">버튼으로 진행 · ESC 닫기</p>
            <button className={`pixel-button px-5 py-3 font-black ${choice === "accept" ? "is-primary" : ""}`} onClick={advanceDialogue} type="button">
              {advanceLabel}
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
