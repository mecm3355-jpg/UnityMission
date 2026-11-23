"use client";

import Link from "next/link";
import { useProgress } from "../../context/progress-context";
import {
  getCompletedMissionIds,
  getLevelSummary,
  hasCompletedAllMissions,
} from "../../lib/game-engine";
import { StorageWarning } from "../storage-warning";

function formatKoreanDate(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Seoul",
  }).format(new Date(value));
}

export function CertificateView() {
  const { isHydrated, progress, warning } = useProgress();

  if (!isHydrated) {
    return (
      <main className="mx-auto min-h-screen max-w-4xl px-5 py-12 sm:px-8">
        <p className="text-lg text-slate-300" role="status">
          수료 조건을 확인하고 있습니다.
        </p>
      </main>
    );
  }

  if (!progress) {
    return <CertificateGate title="학습 기록이 필요합니다." description="닉네임으로 학습을 시작한 뒤 수료증에 도전해 주세요." href="/" />;
  }

  const completedCount = getCompletedMissionIds(progress.completedMissions).length;
  if (!hasCompletedAllMissions(progress)) {
    return (
      <CertificateGate
        title="수료증은 아직 잠겨 있습니다."
        description={`현재 ${completedCount}/5개 미션을 완료했습니다. 다섯 미션의 해설까지 모두 확인하면 열립니다.`}
        href="/dashboard"
      />
    );
  }

  const finalCompletion = progress.completedMissions["mission-5"];
  if (!finalCompletion) {
    return <CertificateGate title="수료 기록을 확인할 수 없습니다." description="대시보드에서 학습 기록을 다시 확인해 주세요." href="/dashboard" />;
  }

  const levelSummary = getLevelSummary(progress);
  const completedDate = formatKoreanDate(finalCompletion.completedAt);

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
      <header className="no-print flex flex-wrap items-center justify-between gap-4">
        <Link className="text-sm font-bold tracking-[0.22em] text-[#F5C968]" href="/dashboard">
          UNITYMISSION
        </Link>
        <Link className="rounded-lg px-3 py-2 text-sm font-semibold hover:bg-white/10" href="/dashboard">
          대시보드
        </Link>
      </header>

      <div className="no-print">
        <StorageWarning warning={warning} />
      </div>

      <article className="certificate-print mt-8 border-8 border-double border-[#F5C968] bg-white px-6 py-10 text-center text-[#0D1730] sm:px-12 sm:py-14">
        <p className="text-sm font-bold tracking-[0.28em] text-[#5279CE]">UNITYMISSION</p>
        <p className="mt-5 text-base font-bold text-slate-600">비공식 학습 참여 확인서</p>
        <h1 className="mt-3 text-4xl font-bold sm:text-5xl">통일·평화교육 미션 완료</h1>

        <p className="mt-10 text-lg text-slate-600">학습자</p>
        <p className="mt-2 break-words text-3xl font-bold sm:text-4xl">{progress.nickname}</p>

        <p className="mx-auto mt-10 max-w-2xl text-lg leading-9 text-slate-700">
          위 학습자는 UnityMission의 다섯 가지 통일·평화교육 미션과 총 15개 문항의 해설을 모두 확인했습니다.
        </p>

        <div className="mx-auto mt-10 grid max-w-2xl gap-4 border-y border-slate-300 py-6 sm:grid-cols-3">
          <div>
            <p className="text-sm text-slate-500">완료 미션</p>
            <p className="mt-1 text-xl font-bold">5개</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">획득 경험치</p>
            <p className="mt-1 text-xl font-bold">{levelSummary.xp} XP</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">최종 레벨</p>
            <p className="mt-1 text-xl font-bold">Lv.{levelSummary.level}</p>
          </div>
        </div>

        <p className="mt-8 text-lg font-semibold">완료일: {completedDate}</p>
        <p className="mt-8 text-sm leading-6 text-slate-600">
          이 확인서는 비공식 학습 참여 확인용이며, 학교·기관의 공식 이수증이나 평가 결과가 아닙니다.
        </p>
      </article>

      <div className="no-print mt-7 flex flex-wrap justify-center gap-3">
        <button
          className="min-h-12 rounded-xl bg-[#F5C968] px-6 py-3 font-bold text-[#0D1730]"
          onClick={() => window.print()}
          type="button"
        >
          인쇄 또는 PDF로 저장
        </button>
        <Link className="min-h-12 rounded-xl border border-white/20 px-6 py-3 font-semibold" href="/dashboard">
          대시보드로
        </Link>
      </div>
    </main>
  );
}

function CertificateGate({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-5 py-12 sm:px-8">
      <p className="text-sm font-bold tracking-[0.22em] text-[#F5C968]">UNITYMISSION</p>
      <h1 className="mt-4 text-3xl font-bold">{title}</h1>
      <p className="mt-4 text-lg leading-8 text-slate-300">{description}</p>
      <Link className="mt-8 w-fit rounded-xl border border-white/20 px-5 py-3 font-semibold" href={href}>
        학습 화면으로
      </Link>
    </main>
  );
}
