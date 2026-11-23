"use client";

import { useState } from "react";
import { useProgress } from "../../context/progress-context";
import { getMissionById } from "../../content/missions";
import { getLevelSummary, type CompletionResult } from "../../lib/game-engine";
import type { MissionId } from "../../types/content";

type RpgQuestPanelProps = {
  missionId: MissionId;
  onClose: () => void;
};

export function RpgQuestPanel({ missionId, onClose }: RpgQuestPanelProps) {
  const { advanceQuestion, completeMission, progress, revealAnswer, selectAnswer } = useProgress();
  const [completion, setCompletion] = useState<CompletionResult | null>(null);
  const mission = getMissionById(missionId);

  if (!mission) return null;

  if (completion) {
    const level = getLevelSummary(completion.progress);
    return (
      <div className="absolute inset-0 z-30 grid place-items-center bg-[#081126]/95 p-4">
        <section aria-labelledby="quest-complete-title" className="w-full max-w-2xl rounded-2xl border-4 border-[#F5C968] bg-[#0D1730] p-6 text-center shadow-2xl" role="dialog" aria-modal="true">
          <p className="text-sm font-bold tracking-[0.18em] text-[#F5C968]">QUEST COMPLETE</p>
          <h2 className="mt-3 text-3xl font-bold" id="quest-complete-title">{mission.title} 완료</h2>
          <p className="mt-4 text-lg text-slate-200">정답 {completion.correctCount}/3</p>
          <p className="mt-2 text-xl font-bold text-[#F5C968]">{completion.xpAwarded > 0 ? "+100 XP · 평화 조각 획득" : "복습 완료 · 추가 XP 없음"}</p>
          <p className="mt-3 animate-pulse text-lg font-bold text-sky-200">{completion.xpAwarded > 0 ? `LEVEL UP · Lv.${level.level}` : `현재 Lv.${level.level}`}</p>
          <button className="mt-7 rounded-xl bg-[#F5C968] px-6 py-3 font-bold text-[#0D1730]" onClick={onClose} type="button">
            마을로 돌아가기
          </button>
        </section>
      </div>
    );
  }

  const attempt = progress?.activeAttempt?.missionId === missionId ? progress.activeAttempt : null;
  if (!attempt) {
    return (
      <div className="absolute inset-0 z-30 grid place-items-center bg-[#081126]/95 p-4">
        <p className="rounded-xl border border-rose-300/40 bg-rose-300/10 px-5 py-4 text-rose-100" role="alert">
          퀘스트 진행 정보를 불러오지 못했습니다. 대화를 닫고 다시 시도해 주세요.
        </p>
      </div>
    );
  }

  const index = attempt.currentIndex;
  const question = mission.questions[index];
  const answer = attempt.answers[index];
  const revealed = attempt.revealedExplanation[index];
  const correct = answer === question.correctIndex;
  const lastQuestion = index === mission.questions.length - 1;

  function handleContinue() {
    if (lastQuestion) setCompletion(completeMission());
    else advanceQuestion();
  }

  return (
    <div className="absolute inset-0 z-30 overflow-y-auto bg-[#081126]/95 p-3 sm:p-6">
      <section aria-labelledby="rpg-question-title" aria-modal="true" className="mx-auto w-full max-w-3xl rounded-2xl border-4 border-[#5279CE] bg-[#0D1730] p-5 shadow-2xl sm:p-7" role="dialog">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-[#F5C968]">{mission.title}</p>
            <p className="mt-1 text-sm text-slate-300">문항 {index + 1}/3</p>
          </div>
          <span className="rounded-lg bg-white/10 px-3 py-2 text-sm font-bold">평화 조각 퀘스트</span>
        </div>

        <h2 className="mt-6 text-2xl font-bold leading-10" id="rpg-question-title">{question.prompt}</h2>
        <fieldset className="mt-6 grid gap-3">
          <legend className="sr-only">답안 선택</legend>
          {question.options.map((option, optionIndex) => (
            <label className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 text-base leading-7 ${answer === optionIndex ? "border-[#F5C968] bg-[#F5C968]/10" : "border-white/15 bg-white/5"}`} key={option}>
              <input
                checked={answer === optionIndex}
                className="mt-1 h-5 w-5 shrink-0 accent-[#F5C968]"
                disabled={revealed}
                name={question.id}
                onChange={() => selectAnswer(optionIndex)}
                type="radio"
              />
              <span>{option}</span>
            </label>
          ))}
        </fieldset>

        {!revealed ? (
          <button className="mt-6 rounded-xl bg-[#F5C968] px-6 py-3 font-bold text-[#0D1730] disabled:cursor-not-allowed disabled:opacity-40" disabled={answer === null} onClick={revealAnswer} type="button">
            답안 제출
          </button>
        ) : (
          <div className={`mt-6 rounded-2xl border p-5 ${correct ? "border-emerald-300/50 bg-emerald-300/10" : "border-rose-300/50 bg-rose-300/10"}`} tabIndex={-1}>
            <h3 className="text-xl font-bold">{correct ? "정답입니다." : "오답입니다."}</h3>
            <p className="mt-3 text-base leading-7">{question.explanation}</p>
            <a className="mt-4 inline-block font-semibold underline decoration-[#F5C968] underline-offset-4" href={question.source.url} rel="noopener noreferrer" target="_blank">
              출처 확인: {question.source.organization} — {question.source.title}
            </a>
            <button className="mt-5 block rounded-xl bg-[#F5C968] px-6 py-3 font-bold text-[#0D1730]" onClick={handleContinue} type="button">
              {lastQuestion ? "퀘스트 완료" : "다음 문항"}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
