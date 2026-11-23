"use client";

import { useState } from "react";
import type { RpgProgress } from "../../game/rpg-progress";

export function RpgHud({ fragmentCount, progress }: { fragmentCount: number; progress: RpgProgress }) {
  const [open, setOpen] = useState(false);
  return (
    <aside className="absolute left-3 top-3 z-20 sm:left-5 sm:top-5" aria-label="RPG 상태">
      <button
        aria-expanded={open}
        className="rounded-xl border-2 border-[#F5C968] bg-[#0D1730]/95 px-4 py-2 text-sm font-bold shadow-xl"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        🎒 조각 {fragmentCount}/5
      </button>
      {open ? (
        <div className="mt-2 w-64 rounded-xl border border-white/20 bg-[#0D1730]/95 p-4 shadow-xl">
          <h2 className="font-bold text-[#F5C968]">아이템 인벤토리</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li>평화 조각: {fragmentCount} / 5</li>
            <li>조화의 열쇠: {progress.harmonyKey ? "획득" : "미획득"}</li>
          </ul>
          <p className="mt-3 text-xs leading-5 text-slate-300">협력 구역의 공명석을 푸른색→황금색→초록색 순서로 깨워 보세요.</p>
        </div>
      ) : null}
    </aside>
  );
}
