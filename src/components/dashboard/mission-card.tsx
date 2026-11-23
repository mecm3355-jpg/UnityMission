import Link from "next/link";
import type { Mission } from "../../types/content";
import type { UnityMissionProgress } from "../../types/progress";
import { isMissionUnlocked } from "../../lib/game-engine";

type MissionCardProps = {
  mission: Mission;
  progress: UnityMissionProgress;
};

export function MissionCard({ mission, progress }: MissionCardProps) {
  const completion = progress.completedMissions[mission.id];
  const unlocked = isMissionUnlocked(mission.id, progress.completedMissions);
  const activeAttempt = progress.activeAttempt?.missionId === mission.id;
  const href = activeAttempt ? `/mission/${mission.id}/play` : `/mission/${mission.id}`;
  const status = completion ? "완료" : activeAttempt ? "진행 중" : unlocked ? "학습 가능" : "잠김";
  const actionLabel = completion ? "복습하기" : activeAttempt ? "이어서 풀기" : "미션 보기";

  return (
    <article
      className={`rounded-2xl border p-5 sm:p-6 ${
        unlocked ? "border-white/15 bg-[#152448]" : "border-white/5 bg-[#111c36] text-slate-400"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold tracking-wider text-[#F5C968]">미션 {mission.order}</p>
          <h3 className="mt-2 text-xl font-bold text-white">{mission.title}</h3>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-sm font-semibold ${
            completion
              ? "bg-emerald-300/15 text-emerald-200"
              : unlocked
                ? "bg-[#5279CE]/25 text-blue-100"
                : "bg-white/5 text-slate-400"
          }`}
        >
          {status}
        </span>
      </div>
      <p className="mt-4 text-base leading-7 text-slate-300">{mission.summary}</p>

      {completion ? (
        <p className="mt-4 text-sm text-slate-300">
          최고 정답 {completion.bestCorrectCount}/3 · 도전 {completion.attemptCount}회
        </p>
      ) : activeAttempt && progress.activeAttempt ? (
        <p className="mt-4 text-sm text-blue-100">
          {progress.activeAttempt.currentIndex + 1}번째 문항에서 이어집니다.
        </p>
      ) : null}

      {unlocked ? (
        <Link
          aria-label={`${mission.title} ${actionLabel}`}
          className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-white/10 px-4 py-2 text-base font-semibold text-white hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F5C968]"
          href={href}
        >
          {actionLabel}
        </Link>
      ) : (
        <p className="mt-5 text-sm text-slate-400">이전 미션을 완료하면 열립니다.</p>
      )}
    </article>
  );
}
