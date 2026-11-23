"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useProgress } from "../../context/progress-context";
import { isMissionUnlocked } from "../../lib/game-engine";
import type { Mission } from "../../types/content";
import { StorageWarning } from "../storage-warning";

export function MissionPlay({ mission }: { mission: Mission }) {
  const router = useRouter();
  const {
    advanceQuestion,
    completeMission,
    isHydrated,
    progress,
    revealAnswer,
    selectAnswer,
    warning,
  } = useProgress();
  const feedbackRef = useRef<HTMLDivElement>(null);
  const attempt = progress?.activeAttempt?.missionId === mission.id ? progress.activeAttempt : null;
  const currentIndex = attempt?.currentIndex ?? 0;
  const revealed = attempt?.revealedExplanation[currentIndex] ?? false;

  useEffect(() => {
    if (revealed) {
      feedbackRef.current?.focus();
    }
  }, [currentIndex, revealed]);

  if (!isHydrated) {
    return (
      <main className="mx-auto min-h-screen max-w-3xl px-5 py-12 sm:px-8">
        <p className="text-lg text-slate-300" role="status">
          저장된 답안을 불러오고 있습니다.
        </p>
      </main>
    );
  }

  if (!progress) {
    return <BlockedPlay title="학습 기록이 필요합니다." description="시작 화면에서 학습 기록을 먼저 만들어 주세요." href="/" />;
  }

  if (!isMissionUnlocked(mission.id, progress.completedMissions)) {
    return <BlockedPlay title="잠긴 미션입니다." description="이전 미션을 완료한 뒤 다시 시도해 주세요." href="/dashboard" />;
  }

  if (!attempt) {
    return (
      <BlockedPlay
        title="진행 중인 시도가 없습니다."
        description="미션 안내에서 시작 버튼을 누르면 첫 문항부터 저장됩니다."
        href={`/mission/${mission.id}`}
      />
    );
  }

  const question = mission.questions[currentIndex];
  const selectedAnswer = attempt.answers[currentIndex];
  const isCorrect = selectedAnswer === question.correctIndex;
  const isLastQuestion = currentIndex === mission.questions.length - 1;

  function handleContinue() {
    if (isLastQuestion) {
      const result = completeMission();
      const query = new URLSearchParams({
        score: String(result.correctCount),
        xp: String(result.xpAwarded),
        first: result.firstCompletion ? "1" : "0",
      });
      router.push(`/mission/${mission.id}/result?${query.toString()}`);
      return;
    }

    advanceQuestion();
  }

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-5 py-8 sm:px-8 sm:py-12">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Link className="text-sm font-bold tracking-[0.22em] text-[#F5C968]" href="/dashboard">
          UNITYMISSION
        </Link>
        <p className="text-base font-semibold" aria-live="polite">
          문항 {currentIndex + 1}/3
        </p>
      </header>

      <StorageWarning warning={warning} />

      <progress
        aria-label={`미션 문항 진행률 ${currentIndex + 1}/3`}
        className="mt-7 h-3 w-full overflow-hidden rounded-full accent-[#F5C968]"
        max={3}
        value={currentIndex + 1}
      />

      <section className="mt-7 rounded-3xl border border-white/10 bg-[#152448] p-6 sm:p-9">
        <p className="text-sm font-bold tracking-wider text-[#5279CE]">{mission.title}</p>
        <h1 className="mt-3 text-2xl font-bold leading-10 sm:text-3xl">{question.prompt}</h1>

        <fieldset className="mt-7 space-y-3">
          <legend className="sr-only">답안 선택</legend>
          {question.options.map((option, optionIndex) => {
            const selected = selectedAnswer === optionIndex;
            const correctOption = revealed && optionIndex === question.correctIndex;
            const wrongSelection = revealed && selected && !correctOption;

            return (
              <label
                className={`flex min-h-14 cursor-pointer items-start gap-3 rounded-xl border px-4 py-4 text-base leading-7 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#F5C968] ${
                  correctOption
                    ? "border-emerald-300 bg-emerald-300/10"
                    : wrongSelection
                      ? "border-rose-300 bg-rose-300/10"
                      : selected
                        ? "border-[#F5C968] bg-[#F5C968]/10"
                        : "border-white/15 bg-[#0D1730] hover:border-white/30"
                }`}
                key={option}
              >
                <input
                  checked={selected}
                  className="mt-1 h-5 w-5 shrink-0 accent-[#F5C968]"
                  disabled={revealed}
                  name={question.id}
                  onChange={() => selectAnswer(optionIndex)}
                  type="radio"
                />
                <span>{option}</span>
              </label>
            );
          })}
        </fieldset>

        {revealed ? (
          <div
            aria-live="assertive"
            className={`mt-7 rounded-2xl border p-5 ${
              isCorrect ? "border-emerald-300/50 bg-emerald-300/10" : "border-rose-300/50 bg-rose-300/10"
            }`}
            ref={feedbackRef}
            tabIndex={-1}
          >
            <h2 className="text-xl font-bold">{isCorrect ? "정답입니다." : "오답입니다."}</h2>
            <p className="mt-3 text-base leading-7 text-slate-100">{question.explanation}</p>
            <a
              className="mt-4 inline-block text-base font-semibold underline decoration-[#F5C968] underline-offset-4"
              href={question.source.url}
              rel="noopener noreferrer"
              target="_blank"
            >
              출처 확인: {question.source.organization} — {question.source.title}
            </a>
            <p className="mt-2 text-sm text-slate-300">검토일 {question.source.reviewedAt}</p>
          </div>
        ) : (
          <button
            className="mt-7 min-h-12 rounded-xl bg-[#F5C968] px-6 py-3 text-base font-bold text-[#0D1730] disabled:cursor-not-allowed disabled:opacity-40"
            disabled={selectedAnswer === null}
            onClick={revealAnswer}
            type="button"
          >
            답안 제출
          </button>
        )}

        {revealed ? (
          <button
            className="mt-5 min-h-12 rounded-xl bg-[#F5C968] px-6 py-3 text-base font-bold text-[#0D1730]"
            onClick={handleContinue}
            type="button"
          >
            {isLastQuestion ? "미션 완료" : "다음 문항"}
          </button>
        ) : null}
      </section>
    </main>
  );
}

function BlockedPlay({ title, description, href }: { title: string; description: string; href: string }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-5 py-12 sm:px-8">
      <p className="text-sm font-bold tracking-[0.22em] text-[#F5C968]">UNITYMISSION</p>
      <h1 className="mt-4 text-3xl font-bold">{title}</h1>
      <p className="mt-4 text-lg leading-8 text-slate-300">{description}</p>
      <Link className="mt-8 w-fit rounded-xl border border-white/20 px-5 py-3 font-semibold" href={href}>
        이전 화면으로
      </Link>
    </main>
  );
}
