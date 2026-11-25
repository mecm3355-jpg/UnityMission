"use client";

import Link from "next/link";
import { useProgress } from "../../context/progress-context";
import { getLevelSummary, MISSION_PASS_CORRECT_COUNT } from "../../lib/game-engine";
import { FAILED_ATTEMPT_REWARD_MESSAGE } from "../../lib/reward-copy";
import { MISSION_IDS, type Mission } from "../../types/content";
import { StorageWarning } from "../storage-warning";

type MissionResultProps = {
  mission: Mission;
  scoreParam?: string;
  xpParam?: string;
  firstParam?: string;
  passParam?: string;
};

function parseScore(value: string | undefined): number | null {
  if (!value || !/^[0-3]$/.test(value)) {
    return null;
  }
  return Number(value);
}

export function MissionResult({ mission, scoreParam, xpParam, firstParam, passParam }: MissionResultProps) {
  const { isHydrated, lastCompletion, progress, warning } = useProgress();

  if (!isHydrated) {
    return (
      <main className="mx-auto min-h-screen max-w-3xl px-5 py-12 sm:px-8">
        <p className="text-lg text-slate-300" role="status">
          미션 결과를 확인하고 있습니다.
        </p>
      </main>
    );
  }

  if (!progress) {
    return <MissingResult description="시작 화면에서 학습 기록을 먼저 만들어 주세요." href="/" />;
  }

  const completion = progress.completedMissions[mission.id];
  const sameCompletion = lastCompletion?.progress.lastVisitedMissionId === mission.id ? lastCompletion : null;
  const parsedScore = parseScore(scoreParam);
  const failedAttemptFromUrl = passParam === "0" && parsedScore !== null;
  if (!completion && !sameCompletion && !failedAttemptFromUrl) {
    return <MissingResult description="세 문항과 해설을 모두 확인한 뒤 결과를 볼 수 있습니다." href={`/mission/${mission.id}`} />;
  }

  const correctCount = sameCompletion?.correctCount ?? parsedScore ?? completion?.bestCorrectCount ?? 0;
  const passed = sameCompletion?.passed ?? (passParam === "1" || correctCount >= MISSION_PASS_CORRECT_COUNT);
  const reportedFirstCompletion = firstParam === "1" && xpParam === "100" && completion?.attemptCount === 1;
  const xpAwarded = sameCompletion?.xpAwarded ?? (reportedFirstCompletion ? 100 : 0);
  const levelSummary = getLevelSummary(progress);
  const currentMissionIndex = MISSION_IDS.indexOf(mission.id);
  const nextMissionId = MISSION_IDS[currentMissionIndex + 1];

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-5 py-8 sm:px-8 sm:py-12">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Link className="text-sm font-bold tracking-[0.22em] text-[#F5C968]" href="/dashboard">
          UNITYMISSION
        </Link>
        <p className="text-base font-semibold text-slate-300">미션 {mission.order} 결과</p>
      </header>

      <StorageWarning warning={warning} />

      <section className="mt-8 rounded-3xl border border-white/10 bg-[#152448] p-6 text-center sm:p-10">
        <p className="text-sm font-bold tracking-wider text-[#5279CE]">{passed ? "MISSION COMPLETE" : "TRY AGAIN"}</p>
        <h1 className="mt-3 text-3xl font-bold sm:text-4xl">
          {passed ? `${mission.title} 완료` : "통과 기준에 조금 못 미쳤어요"}
        </h1>
        <p className="mt-4 text-lg text-slate-300">
          {passed ? "해설까지 모두 확인했습니다." : `3문항 중 ${MISSION_PASS_CORRECT_COUNT}문항 이상을 맞혀야 통과합니다.`}
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-[#0D1730] p-6">
            <p className="text-sm text-slate-400">이번 정답 수</p>
            <p className="mt-2 text-3xl font-bold">{correctCount}/3</p>
          </div>
          <div className="rounded-2xl bg-[#0D1730] p-6">
            <p className="text-sm text-slate-400">이번 도전 보상</p>
            <p className="mt-2 text-3xl font-bold text-[#F5C968]">{xpAwarded > 0 ? `+${xpAwarded} XP` : "0 XP"}</p>
          </div>
        </div>

        {!passed ? (
          <p className="mt-5 text-base leading-7 text-slate-300">
            {FAILED_ATTEMPT_REWARD_MESSAGE} 힌트와 해설을 떠올리며 다시 도전해 보세요.
          </p>
        ) : xpAwarded === 0 ? (
          <p className="mt-5 text-base leading-7 text-slate-300">
            복습에서는 XP가 중복 지급되지 않으며, 최고 기록만 갱신됩니다.
          </p>
        ) : null}

        <p className="mt-6 text-base font-semibold">
          누적 {levelSummary.xp} XP · Lv.{levelSummary.level} {levelSummary.title}
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {passed && nextMissionId ? (
            <Link className="min-h-12 rounded-xl bg-[#F5C968] px-6 py-3 font-bold text-[#0D1730]" href={`/mission/${nextMissionId}`}>
              다음 미션 보기
            </Link>
          ) : null}
          <Link className="min-h-12 rounded-xl border border-white/20 px-6 py-3 font-semibold" href="/dashboard">
            대시보드로
          </Link>
          <Link className="min-h-12 rounded-xl border border-white/20 px-6 py-3 font-semibold" href={`/mission/${mission.id}`}>
            {passed ? "다시 풀기" : "미션 다시 도전"}
          </Link>
        </div>
      </section>
    </main>
  );
}

function MissingResult({ description, href }: { description: string; href: string }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-5 py-12 sm:px-8">
      <h1 className="text-3xl font-bold">아직 표시할 결과가 없습니다.</h1>
      <p className="mt-4 text-lg leading-8 text-slate-300">{description}</p>
      <Link className="mt-8 w-fit rounded-xl border border-white/20 px-5 py-3 font-semibold" href={href}>
        학습 화면으로
      </Link>
    </main>
  );
}
