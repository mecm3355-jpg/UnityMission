"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { missions } from "../../content/missions";
import { useProgress } from "../../context/progress-context";
import {
  getCompletedMissionIds,
  getLevelSummary,
  getProgressPercent,
} from "../../lib/game-engine";
import { StorageWarning } from "../storage-warning";
import { MissionCard } from "./mission-card";

export function DashboardView() {
  const router = useRouter();
  const { isHydrated, progress, warning, clearProgress } = useProgress();
  const [confirmClear, setConfirmClear] = useState(false);

  if (!isHydrated) {
    return (
      <main className="mx-auto min-h-screen max-w-6xl px-5 py-12 sm:px-8">
        <p className="text-lg text-slate-300" role="status">
          대시보드를 준비하고 있습니다.
        </p>
      </main>
    );
  }

  if (!progress) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-5 py-12 sm:px-8">
        <p className="text-sm font-bold tracking-[0.22em] text-[#F5C968]">UNITYMISSION</p>
        <h1 className="mt-4 text-4xl font-bold">먼저 학습 기록을 만들어 주세요.</h1>
        <p className="mt-4 text-lg leading-8 text-slate-300">
          시작 화면에서 닉네임을 입력하면 첫 번째 미션이 열립니다.
        </p>
        <Link
          className="mt-8 w-fit rounded-xl bg-[#F5C968] px-5 py-3 font-bold text-[#0D1730]"
          href="/"
        >
          시작 화면으로
        </Link>
      </main>
    );
  }

  const levelSummary = getLevelSummary(progress);
  const completedCount = getCompletedMissionIds(progress.completedMissions).length;
  const progressPercent = getProgressPercent(progress);

  function handleClear() {
    clearProgress();
    router.replace("/");
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Link className="text-sm font-bold tracking-[0.22em] text-[#F5C968]" href="/">
          UNITYMISSION
        </Link>
        <nav aria-label="보조 학습 메뉴" className="flex flex-wrap gap-3 text-sm font-semibold">
          <Link className="rounded-lg px-3 py-2 hover:bg-white/10" href="/badges">
            배지
          </Link>
          <Link className="rounded-lg px-3 py-2 hover:bg-white/10" href="/certificate">
            수료증
          </Link>
        </nav>
      </header>

      <StorageWarning warning={warning} />

      <section className="mt-8 rounded-3xl border border-white/10 bg-[#152448] p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="text-base text-slate-300">안녕하세요,</p>
            <h1 className="mt-1 text-3xl font-bold sm:text-4xl">{progress.nickname}님</h1>
            <p className="mt-3 text-base text-slate-300">
              Lv.{levelSummary.level} {levelSummary.title}
            </p>
          </div>
          <div className="rounded-2xl bg-[#0D1730] px-5 py-4 text-right">
            <p className="text-sm text-slate-400">누적 경험치</p>
            <p className="mt-1 text-2xl font-bold text-[#F5C968]">{levelSummary.xp} XP</p>
          </div>
        </div>

        <div className="mt-7">
          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="font-semibold">전체 학습 진행률</span>
            <span className="text-slate-300">{completedCount}/5 미션 완료</span>
          </div>
          <progress
            aria-label={`전체 학습 진행률 ${progressPercent}%`}
            className="mt-3 h-3 w-full overflow-hidden rounded-full accent-[#F5C968]"
            max={100}
            value={progressPercent}
          />
        </div>
      </section>

      <section aria-labelledby="missions-title" className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-bold tracking-wider text-[#5279CE]">LEARNING PATH</p>
            <h2 className="mt-2 text-3xl font-bold" id="missions-title">
              다섯 가지 미션
            </h2>
          </div>
          <p className="text-base text-slate-300">각 미션을 완료하면 다음 미션이 열립니다.</p>
        </div>
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          {missions.map((mission) => (
            <MissionCard key={mission.id} mission={mission} progress={progress} />
          ))}
        </div>
      </section>

      <section className="mt-10 rounded-2xl border border-white/10 p-5 sm:p-6">
        <h2 className="text-xl font-bold">공용 기기에서 학습했나요?</h2>
        <p className="mt-2 text-base leading-7 text-slate-300">
          학습 기록에는 닉네임과 진행 상황이 남습니다. 사용을 마치면 기록을 초기화해 주세요.
        </p>
        {confirmClear ? (
          <div className="mt-5 flex flex-wrap gap-3" role="group" aria-label="학습 기록 초기화 확인">
            <button
              className="rounded-xl bg-rose-200 px-4 py-3 text-base font-bold text-rose-950"
              onClick={handleClear}
              type="button"
            >
              모든 기록 초기화
            </button>
            <button
              className="rounded-xl border border-white/20 px-4 py-3 text-base font-semibold"
              onClick={() => setConfirmClear(false)}
              type="button"
            >
              취소
            </button>
          </div>
        ) : (
          <button
            className="mt-5 rounded-xl border border-rose-200/50 px-4 py-3 text-base font-semibold text-rose-100 hover:bg-rose-200/10"
            onClick={() => setConfirmClear(true)}
            type="button"
          >
            기록 초기화
          </button>
        )}
      </section>
    </main>
  );
}
