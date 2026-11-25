"use client";

import { useState } from "react";
import { useProgress } from "../../context/progress-context";
import { getMissionById } from "../../content/missions";
import {
  getLevelSummary,
  MISSION_PASS_CORRECT_COUNT,
  type CompletionResult,
} from "../../lib/game-engine";
import type { MissionId } from "../../types/content";

type RpgQuestPanelProps = {
  missionId: MissionId;
  onClose: () => void;
  onAnswerFeedback?: (correct: boolean) => void;
  onMissionComplete?: (rewarded: boolean) => void;
};

export function RpgQuestPanel({ missionId, onAnswerFeedback, onClose, onMissionComplete }: RpgQuestPanelProps) {
  const { advanceQuestion, beginMission, completeMission, progress, revealAnswer, selectAnswer } = useProgress();
  const [completion, setCompletion] = useState<CompletionResult | null>(null);
  const [hintedQuestionId, setHintedQuestionId] = useState<string | null>(null);
  const mission = getMissionById(missionId);

  if (!mission) return null;

  if (completion) {
    const level = getLevelSummary(completion.progress);
    return (
      <div className="quest-backdrop absolute inset-0 z-30 grid place-items-center p-4">
        <section aria-labelledby="quest-complete-title" className="game-panel quest-complete-panel w-full max-w-2xl p-6 text-center" role="dialog" aria-modal="true">
          <p className="text-sm font-bold tracking-[0.18em] text-[#F5C968]">{completion.passed ? "QUEST COMPLETE" : "TRY AGAIN"}</p>
          <h2 className="mt-3 text-3xl font-bold" id="quest-complete-title">
            {completion.passed ? `${mission.title} 완료` : "통과 기준에 조금 못 미쳤어요"}
          </h2>
          <p className="mt-4 text-lg text-slate-200">정답 {completion.correctCount}/3</p>
          <p className="mt-2 text-xl font-bold text-[#F5C968]">
            {completion.passed
              ? completion.xpAwarded > 0
                ? "+100 XP · 평화 조각 획득"
                : "복습 통과 · 추가 XP 없음"
              : `통과하려면 ${MISSION_PASS_CORRECT_COUNT}/3 이상이 필요합니다`}
          </p>
          {completion.xpAwarded > 0 ? (
            <div aria-label="평화 조각 획득 애니메이션" className="quest-reward-burst mt-5" role="img">
              <span>◆</span><span>✦</span><span>◆</span><span>✦</span><span>◆</span>
            </div>
          ) : null}
          {completion.passed ? (
            <p className={`mt-3 text-lg font-bold text-sky-200 ${completion.xpAwarded > 0 ? "level-up-flash" : ""}`}>
              {completion.xpAwarded > 0 ? `LEVEL UP · Lv.${level.level}` : `현재 Lv.${level.level}`}
            </p>
          ) : (
            <p className="mt-4 leading-7 text-slate-200">힌트와 해설을 떠올리며 바로 다시 도전해 보세요. 실패한 시도에는 XP가 지급되지 않습니다.</p>
          )}
          <button
            className="pixel-button is-primary mt-7 px-6 py-3 font-black"
            onClick={() => {
              if (completion.passed) {
                onClose();
                return;
              }
              beginMission(missionId);
              setCompletion(null);
              setHintedQuestionId(null);
            }}
            type="button"
          >
            {completion.passed ? "마을로 돌아가기" : "미션 다시 도전"}
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
    if (lastQuestion) {
      const result = completeMission();
      setCompletion(result);
      onMissionComplete?.(result.xpAwarded > 0);
    }
    else advanceQuestion();
  }

  function handleSubmitAnswer() {
    if (answer === null) return;
    if (!correct && hintedQuestionId !== question.id) {
      setHintedQuestionId(question.id);
      onAnswerFeedback?.(false);
      return;
    }
    revealAnswer();
    onAnswerFeedback?.(correct);
  }

  return (
    <div className="quest-backdrop absolute inset-0 z-30 overflow-y-auto p-3 sm:p-6">
      <section aria-labelledby="rpg-question-title" aria-modal="true" className="game-panel quest-panel mx-auto w-full max-w-3xl p-5 sm:p-7" role="dialog">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-[#F5C968]">{mission.title}</p>
            <p className="mt-1 text-sm text-slate-300">문항 {index + 1}/3</p>
          </div>
          <span className="quest-ribbon px-3 py-2 text-sm font-black">◆ 평화 조각 퀘스트</span>
        </div>

        <div aria-label={`문항 ${index + 1}/3`} className="mt-5 flex gap-2" role="progressbar" aria-valuemax={3} aria-valuemin={1} aria-valuenow={index + 1}>
          {mission.questions.map((item, questionIndex) => <span className={`quest-progress-pip ${questionIndex <= index ? "is-active" : ""}`} key={item.id} />)}
        </div>

        <h2 className="mt-5 text-2xl font-black leading-10" id="rpg-question-title">{question.prompt}</h2>
        <fieldset className="mt-6 grid gap-3">
          <legend className="sr-only">답안 선택</legend>
          {question.options.map((option, optionIndex) => (
            <label className={`quest-option flex cursor-pointer items-start gap-3 px-4 py-3 text-base leading-7 ${answer === optionIndex ? "is-selected" : ""}`} key={option}>
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
          <>
            {hintedQuestionId === question.id ? (
              <div aria-live="assertive" className="mt-5 rounded-2xl border border-amber-300/50 bg-amber-300/10 p-4" tabIndex={-1}>
                <h3 className="font-bold text-amber-100">힌트를 확인하고 다시 선택해 보세요</h3>
                <p className="mt-2 leading-7">{question.hint}</p>
              </div>
            ) : null}
            <button className="pixel-button is-primary mt-6 px-6 py-3 font-black disabled:cursor-not-allowed disabled:opacity-40" disabled={answer === null} onClick={handleSubmitAnswer} type="button">
              {hintedQuestionId === question.id ? "다시 제출" : "답안 제출"}
            </button>
          </>
        ) : (
          <div className={`mt-6 rounded-2xl border p-5 ${correct ? "border-emerald-300/50 bg-emerald-300/10" : "border-rose-300/50 bg-rose-300/10"}`} tabIndex={-1}>
            <h3 className="text-xl font-bold">{correct ? "정답입니다." : "오답입니다."}</h3>
            <p className="mt-3 text-base leading-7">{question.explanation}</p>
            <a className="mt-4 inline-block font-semibold underline decoration-[#F5C968] underline-offset-4" href={question.source.url} rel="noopener noreferrer" target="_blank">
              출처 확인: {question.source.organization} — {question.source.title}
            </a>
            <button className="pixel-button is-primary mt-5 block px-6 py-3 font-black" onClick={handleContinue} type="button">
              {lastQuestion ? "퀘스트 완료" : "다음 문항"}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
