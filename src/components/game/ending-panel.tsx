"use client";

import Link from "next/link";

export function EndingPanel({ level, nickname, onClose }: { level: number; nickname: string; onClose: () => void }) {
  return (
    <div className="absolute inset-0 z-40 grid place-items-center overflow-y-auto bg-[#07101f]/95 p-4">
      <section aria-labelledby="ending-title" aria-modal="true" className="w-full max-w-3xl rounded-3xl border-4 border-[#F5C968] bg-[#0D1730] p-6 text-center shadow-2xl sm:p-10" role="dialog">
        <p className="text-sm font-bold tracking-[0.25em] text-[#F5C968]">PEACE VILLAGE RESTORED</p>
        <div aria-label="다섯 평화 조각 결합" className="mx-auto my-7 flex max-w-md items-center justify-center gap-2 text-4xl" role="img">
          <span>◆</span><span className="text-sky-300">◆</span><span className="text-emerald-300">◆</span><span className="text-rose-300">◆</span><span className="text-violet-300">◆</span>
        </div>
        <h2 className="text-3xl font-bold sm:text-4xl" id="ending-title">평화마을이 다시 빛납니다</h2>
        <p className="mt-4 text-lg leading-8 text-slate-200">{nickname}님이 다섯 평화 조각을 모아 통일교육 여정을 완료했습니다.</p>
        <p className="mt-3 text-xl font-bold text-[#F5C968]">최종 레벨 Lv.{level}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link className="rounded-xl bg-[#F5C968] px-5 py-3 font-bold text-[#0D1730]" href="/certificate">비공식 수료증 보기</Link>
          <button className="rounded-xl border border-white/30 px-5 py-3 font-bold" onClick={onClose} type="button">다시 탐험하기</button>
        </div>
      </section>
    </div>
  );
}
