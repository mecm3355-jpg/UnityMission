"use client";

import { useState } from "react";
import type { RpgProgress } from "../../game/rpg-progress";

export function RpgHud({ fragmentCount, progress }: { fragmentCount: number; progress: RpgProgress }) {
  const [open, setOpen] = useState(false);
  return (
    <aside className="absolute left-3 top-3 z-20 sm:left-5 sm:top-5" aria-label="RPG 상태">
      <button
        aria-label={`🎒 조각 ${fragmentCount}/5`}
        aria-expanded={open}
        className="inventory-trigger px-3 py-2 text-sm font-black"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <span aria-hidden="true" className="mr-2 text-[#F9D873]">◆</span>평화 조각 {fragmentCount}/5
      </button>
      {open ? (
        <div className="game-panel mt-2 w-64 p-4">
          <p className="text-[10px] font-black tracking-[0.2em] text-sky-200">ADVENTURE BAG</p>
          <h2 className="mt-1 font-black text-[#F9D873]">아이템 인벤토리</h2>
          <div aria-label={`평화 조각 ${fragmentCount}개`} className="mt-3 flex gap-2" role="img">
            {Array.from({ length: 5 }, (_, index) => (
              <span aria-hidden="true" className={`fragment-slot ${index < fragmentCount ? "is-filled" : ""}`} key={index}>◆</span>
            ))}
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            <li>평화 조각: {fragmentCount} / 5</li>
            <li className={progress.harmonyKey ? "text-emerald-200" : "text-slate-400"}>조화의 열쇠: {progress.harmonyKey ? "획득" : "미획득"}</li>
          </ul>
          <p className="mt-3 text-xs leading-5 text-slate-300">협력 구역의 공명석을 푸른색→황금색→초록색 순서로 깨워 보세요.</p>
        </div>
      ) : null}
    </aside>
  );
}
