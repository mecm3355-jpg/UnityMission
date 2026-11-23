"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useProgress } from "../../context/progress-context";
import { isMissionUnlocked } from "../../lib/game-engine";
import type { Mission } from "../../types/content";
import { StorageWarning } from "../storage-warning";

export function MissionDetail({ mission }: { mission: Mission }) {
  const router = useRouter();
  const { beginMission, isHydrated, progress, warning } = useProgress();

  if (!isHydrated) {
    return (
      <main className="mx-auto min-h-screen max-w-3xl px-5 py-12 sm:px-8">
        <p className="text-lg text-slate-300" role="status">
          미션을 확인하고 있습니다.
        </p>
      </main>
    );
  }

  if (!progress) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-5 py-12 sm:px-8">
        <h1 className="text-3xl font-bold">학습 기록이 필요합니다.</h1>
        <p className="mt-4 text-lg leading-8 text-slate-300">
          시작 화면에서 닉네임을 입력한 뒤 미션에 참여해 주세요.
        </p>
        <Link className="mt-8 w-fit rounded-xl bg-[#F5C968] px-5 py-3 font-bold text-[#0D1730]" href="/">
          시작 화면으로
        </Link>
      </main>
    );
  }

  if (!isMissionUnlocked(mission.id, progress.completedMissions)) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-5 py-12 sm:px-8">
        <p className="text-sm font-bold tracking-[0.22em] text-[#F5C968]">UNITYMISSION</p>
        <h1 className="mt-4 text-3xl font-bold">잠긴 미션입니다.</h1>
        <p className="mt-4 text-lg leading-8 text-slate-300">
          이전 미션을 완료하면 이 미션의 학습 내용을 확인할 수 있습니다.
        </p>
        <Link className="mt-8 w-fit rounded-xl border border-white/20 px-5 py-3 font-semibold" href="/dashboard">
          대시보드로
        </Link>
      </main>
    );
  }

  const completion = progress.completedMissions[mission.id];
  const activeAttempt = progress.activeAttempt?.missionId === mission.id;

  function handleStart() {
    if (!activeAttempt) {
      beginMission(mission.id);
    }
    router.push(`/mission/${mission.id}/play`);
  }

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-5 py-8 sm:px-8 sm:py-12">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Link className="text-sm font-bold tracking-[0.22em] text-[#F5C968]" href="/dashboard">
          UNITYMISSION
        </Link>
        <p className="text-base font-semibold text-slate-300">미션 {mission.order} · 3문항</p>
      </header>

      <StorageWarning warning={warning} />

      <section className="mt-8 rounded-3xl border border-white/10 bg-[#152448] p-6 sm:p-9">
        <p className="text-sm font-bold tracking-wider text-[#5279CE]">MISSION BRIEFING</p>
        <h1 className="mt-3 text-3xl font-bold sm:text-4xl">{mission.title}</h1>
        <p className="mt-4 text-lg leading-8 text-slate-200">{mission.summary}</p>

        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          <section className="rounded-2xl bg-[#0D1730] p-5" aria-labelledby="background-title">
            <h2 className="text-xl font-bold" id="background-title">
              배경 이야기
            </h2>
            <p className="mt-3 text-base leading-7 text-slate-300">{mission.background}</p>
          </section>
          <section className="rounded-2xl bg-[#0D1730] p-5" aria-labelledby="objectives-title">
            <h2 className="text-xl font-bold" id="objectives-title">
              학습 목표
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-base leading-7 text-slate-300">
              {mission.learningObjectives.map((objective) => (
                <li key={objective}>{objective}</li>
              ))}
            </ul>
          </section>
        </div>

        <div className="mt-7 rounded-2xl border border-[#F5C968]/30 bg-[#F5C968]/10 p-5">
          <p className="font-bold text-[#F5C968]">
            {completion ? "복습 보상: 0 XP" : `최초 완료 보상: ${mission.rewardXp} XP`}
          </p>
          <p className="mt-2 text-base leading-7 text-slate-200">
            세 문항의 답을 제출하고 각 해설을 확인하면 미션이 완료됩니다. 오답이어도 해설을 읽은 뒤 계속할 수 있습니다.
          </p>
        </div>

        {progress.activeAttempt && !activeAttempt ? (
          <p className="mt-5 text-sm leading-6 text-amber-100" role="status">
            다른 미션의 진행 중 기록이 있습니다. 이 미션을 시작하면 해당 기록은 새 시도로 바뀝니다.
          </p>
        ) : null}

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            className="min-h-12 rounded-xl bg-[#F5C968] px-6 py-3 text-base font-bold text-[#0D1730] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            onClick={handleStart}
            type="button"
          >
            {activeAttempt ? "이어서 풀기" : completion ? "복습 시작하기" : "미션 시작하기"}
          </button>
          <Link className="min-h-12 rounded-xl border border-white/20 px-6 py-3 text-base font-semibold" href="/dashboard">
            대시보드로
          </Link>
        </div>
      </section>
    </main>
  );
}
