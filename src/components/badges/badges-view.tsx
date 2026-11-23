"use client";

import Link from "next/link";
import { useProgress } from "../../context/progress-context";
import { getBadgeSummaries } from "../../lib/badges";
import { getCompletedMissionIds } from "../../lib/game-engine";
import { StorageWarning } from "../storage-warning";

function formatKoreanDate(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Seoul",
  }).format(new Date(value));
}

export function BadgesView() {
  const { isHydrated, progress, warning } = useProgress();

  if (!isHydrated) {
    return (
      <main className="mx-auto min-h-screen max-w-6xl px-5 py-12 sm:px-8">
        <p className="text-lg text-slate-300" role="status">
          배지 기록을 불러오고 있습니다.
        </p>
      </main>
    );
  }

  if (!progress) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-5 py-12 sm:px-8">
        <h1 className="text-3xl font-bold">학습 기록이 필요합니다.</h1>
        <p className="mt-4 text-lg leading-8 text-slate-300">
          닉네임으로 학습을 시작하면 미션 완료에 따라 배지가 열립니다.
        </p>
        <Link className="mt-8 w-fit rounded-xl bg-[#F5C968] px-5 py-3 font-bold text-[#0D1730]" href="/">
          시작 화면으로
        </Link>
      </main>
    );
  }

  const badges = getBadgeSummaries(progress.completedMissions);
  const earnedCount = getCompletedMissionIds(progress.completedMissions).length;

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Link className="text-sm font-bold tracking-[0.22em] text-[#F5C968]" href="/dashboard">
          UNITYMISSION
        </Link>
        <Link className="rounded-lg px-3 py-2 text-sm font-semibold hover:bg-white/10" href="/dashboard">
          대시보드
        </Link>
      </header>

      <StorageWarning warning={warning} />

      <section className="mt-8">
        <p className="text-sm font-bold tracking-wider text-[#5279CE]">BADGE COLLECTION</p>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">나의 평화 학습 배지</h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-300">
          미션을 처음 완료할 때마다 해당 배지를 얻습니다. 현재 {earnedCount}/5개를 획득했습니다.
        </p>
      </section>

      <section aria-label="배지 목록" className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {badges.map((badge) => (
          <article
            aria-label={`${badge.title} 배지 ${badge.earned ? "획득" : "잠김"}`}
            className={`rounded-3xl border p-6 ${
              badge.earned
                ? "border-[#F5C968]/50 bg-[#152448]"
                : "border-white/10 bg-[#111C36] text-slate-400"
            }`}
            key={badge.missionId}
          >
            <div
              aria-hidden="true"
              className={`flex h-20 w-20 items-center justify-center rounded-full border-4 text-base font-bold ${
                badge.earned
                  ? "border-[#F5C968] bg-[#F5C968]/10 text-[#F5C968]"
                  : "border-slate-600 bg-slate-800 text-slate-400"
              }`}
            >
              {badge.label}
            </div>
            <div className="mt-5 flex flex-wrap items-start justify-between gap-3">
              <h2 className="text-xl font-bold text-white">{badge.title}</h2>
              <span
                className={`rounded-full px-3 py-1 text-sm font-semibold ${
                  badge.earned
                    ? "bg-emerald-300/15 text-emerald-200"
                    : "bg-white/5 text-slate-400"
                }`}
              >
                {badge.earned ? "획득" : "잠김"}
              </span>
            </div>
            <p className="mt-3 text-base leading-7 text-slate-300">{badge.description}</p>
            <p className="mt-4 text-sm font-semibold text-slate-300">획득 조건: {badge.condition}</p>
            {badge.earnedAt ? (
              <p className="mt-2 text-sm text-[#F5C968]">획득일: {formatKoreanDate(badge.earnedAt)}</p>
            ) : null}
          </article>
        ))}
      </section>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link className="min-h-12 rounded-xl bg-[#F5C968] px-6 py-3 font-bold text-[#0D1730]" href="/dashboard">
          미션 계속하기
        </Link>
        <Link className="min-h-12 rounded-xl border border-white/20 px-6 py-3 font-semibold" href="/certificate">
          수료증 확인
        </Link>
      </div>
    </main>
  );
}
