"use client";

import Link from "next/link";

export function EndingPanel({ level, nickname, onClose }: { level: number; nickname: string; onClose: () => void }) {
  return (
    <div className="ending-backdrop absolute inset-0 z-40 grid place-items-center overflow-y-auto p-4">
      <section aria-labelledby="ending-title" aria-modal="true" className="game-panel ending-panel w-full max-w-3xl p-6 text-center sm:p-10" role="dialog">
        <p className="text-sm font-bold tracking-[0.25em] text-[#F5C968]">PEACE VILLAGE RESTORED</p>
        <div aria-label="다섯 평화 조각 결합" className="ending-fragments mx-auto my-7 flex max-w-md items-center justify-center gap-2 text-4xl" role="img">
          <span>◆</span><span className="text-sky-300">◆</span><span className="text-emerald-300">◆</span><span className="text-rose-300">◆</span><span className="text-violet-300">◆</span>
        </div>
        <h2 className="text-3xl font-bold sm:text-4xl" id="ending-title">평화마을이 다시 빛납니다</h2>
        <p className="mt-4 text-lg leading-8 text-slate-200">{nickname}님이 다섯 평화 조각을 모아 통일교육 여정을 완료했습니다.</p>
        <p className="mt-3 text-xl font-bold text-[#F5C968]">최종 레벨 Lv.{level}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link className="pixel-button is-primary px-5 py-3 font-black" href="/certificate">비공식 수료증 보기</Link>
          <button className="pixel-button px-5 py-3 font-black" onClick={onClose} type="button">다시 탐험하기</button>
        </div>
      </section>
    </div>
  );
}
