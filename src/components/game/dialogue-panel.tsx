"use client";

import { useEffect, useRef, useState } from "react";
import { getNpcMessage, getNpcQuestState, type NpcDefinition } from "../../game/npcs";
import type { MissionId } from "../../types/content";
import type { CompletedMissions } from "../../types/progress";

type DialoguePanelProps = {
  npc: NpcDefinition;
  completedMissions: CompletedMissions;
  onClose: () => void;
  onStartQuest?: (missionId: MissionId) => void;
};

export function DialoguePanel({ npc, completedMissions, onClose, onStartQuest }: DialoguePanelProps) {
  const [choice, setChoice] = useState<"accept" | "later" | null>(null);
  const panelRef = useRef<HTMLElement>(null);
  const state = getNpcQuestState(npc, completedMissions);
  const message = getNpcMessage(npc, completedMissions);

  useEffect(() => {
    panelRef.current?.focus();
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  return (
    <div className="absolute inset-0 z-30 flex items-end bg-black/45 p-3 sm:p-6" role="presentation">
      <section
        aria-labelledby="dialogue-name"
        aria-modal="true"
        className="mx-auto w-full max-w-3xl rounded-2xl border-4 border-[#F5C968] bg-[#0D1730] p-5 shadow-2xl sm:p-7"
        ref={panelRef}
        role="dialog"
        tabIndex={-1}
      >
        <p className="text-sm font-bold text-[#F5C968]">{npc.role}</p>
        <h2 className="mt-1 text-2xl font-bold" id="dialogue-name">{npc.name}</h2>
        <p className="mt-4 text-base leading-7 text-slate-100">{message}</p>

        {state === "available" && !choice ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-2" aria-label="대화 선택지" role="group">
            <button className="rounded-xl bg-[#F5C968] px-4 py-3 font-bold text-[#0D1730]" onClick={() => setChoice("accept")} type="button">
              퀘스트를 도울게요
            </button>
            <button className="rounded-xl border border-white/20 px-4 py-3 font-semibold" onClick={() => setChoice("later")} type="button">
              조금 더 둘러볼게요
            </button>
          </div>
        ) : (
          <p className="mt-5 rounded-xl bg-white/5 px-4 py-3 text-sm text-slate-200" role="status">
            {choice === "accept" ? "좋아요. 퀘스트 준비가 끝났어요." : choice === "later" ? "천천히 둘러보고 다시 찾아오세요." : state === "completed" ? "완료된 퀘스트의 이야기를 들었습니다." : "선행 퀘스트를 완료하면 다시 대화할 수 있습니다."}
          </p>
        )}

        <div className="mt-5 flex justify-end">
          <button
            className="rounded-xl border border-white/25 px-5 py-3 font-bold"
            onClick={() => {
              if (choice === "accept" && onStartQuest) onStartQuest(npc.missionId);
              else onClose();
            }}
            type="button"
          >
            {choice === "accept" ? "퀘스트 시작" : choice === null && state === "available" ? "대화 닫기" : "다음"}
          </button>
        </div>
      </section>
    </div>
  );
}
