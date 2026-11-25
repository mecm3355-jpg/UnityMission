// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { getMissionById } from "../../content/missions";
import { ProgressProvider, useProgress } from "../../context/progress-context";
import {
  advanceToNextQuestion,
  completeActiveAttempt,
  createInitialProgress,
  getLevelSummary,
  hasCompletedAllMissions,
  revealCurrentExplanation,
  startMissionAttempt,
  submitCurrentAnswer,
  type CompletionResult,
} from "../../lib/game-engine";
import { PROGRESS_STORAGE_KEY } from "../../lib/progress-storage";
import { FAILED_ATTEMPT_REWARD_MESSAGE } from "../../lib/reward-copy";
import { MISSION_IDS, type MissionId } from "../../types/content";
import type { UnityMissionProgress } from "../../types/progress";
import { RpgQuestPanel } from "./rpg-quest-panel";

function QuestHarness({
  missionId = "mission-1",
  onMissionComplete,
}: {
  missionId?: MissionId;
  onMissionComplete?: (result: CompletionResult) => void;
}) {
  const { beginMission, progress } = useProgress();
  const [started, setStarted] = useState(false);
  if (!progress) return null;
  if (!started) {
    return (
      <button
        onClick={() => {
          beginMission(missionId);
          setStarted(true);
        }}
        type="button"
      >
        테스트 퀘스트 시작
      </button>
    );
  }
  return <RpgQuestPanel missionId={missionId} onClose={() => undefined} onMissionComplete={onMissionComplete} />;
}

function completeMissionForSetup(progress: UnityMissionProgress, missionId: MissionId, startMinute: number) {
  const mission = getMissionById(missionId);
  if (!mission) throw new Error("Test mission not found");
  const timestamp = (offset: number) => new Date(Date.parse("2026-11-23T09:00:00.000Z") + (startMinute + offset) * 60_000).toISOString();
  let next = startMissionAttempt(progress, missionId, timestamp(0));
  mission.questions.forEach((question, index) => {
    next = submitCurrentAnswer(next, question.correctIndex, timestamp(index * 3 + 1));
    next = revealCurrentExplanation(next, timestamp(index * 3 + 2));
    if (index < 2) next = advanceToNextQuestion(next, timestamp(index * 3 + 3));
  });
  return completeActiveAttempt(next, timestamp(10)).progress;
}

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("R05 RPG quest panel", () => {
  it("reuses all three existing questions, explanations, and the shared completion ledger", async () => {
    const user = userEvent.setup();
    const initial = createInitialProgress("평화별", "2026-11-23T09:00:00.000Z");
    window.localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(initial));
    render(<ProgressProvider><QuestHarness /></ProgressProvider>);

    await user.click(await screen.findByRole("button", { name: "테스트 퀘스트 시작" }));
    const mission = getMissionById("mission-1");
    if (!mission) throw new Error("Test mission not found");
    for (let index = 0; index < 3; index += 1) {
      const choices = await screen.findAllByRole("radio");
      if (index === 0) {
        await user.click(choices[(mission.questions[index].correctIndex + 1) % 4]);
        await user.click(screen.getByRole("button", { name: "답안 제출" }));
        expect(await screen.findByRole("heading", { name: "힌트를 확인하고 다시 선택해 보세요" })).toBeTruthy();
        expect(screen.getByRole("button", { name: "다시 제출" })).toHaveProperty("disabled", true);
      }
      await user.click(choices[mission.questions[index].correctIndex]);
      if (index === 0) {
        expect(screen.getByRole("button", { name: "다시 제출" })).toHaveProperty("disabled", false);
      }
      await user.click(screen.getByRole("button", { name: index === 0 ? "다시 제출" : "답안 제출" }));
      expect(await screen.findByText(/정답입니다.|오답입니다./)).toBeTruthy();
      expect(screen.getByRole("link", { name: /출처 확인:/ })).toBeTruthy();
      await user.click(screen.getByRole("button", { name: index === 2 ? "퀘스트 완료" : "다음 문항" }));
    }

    expect(await screen.findByRole("heading", { name: /완료$/ })).toBeTruthy();
    expect(screen.getByText("+100 XP · 평화 조각 획득")).toBeTruthy();
    expect(screen.getByRole("img", { name: "평화 조각 획득 애니메이션" })).toBeTruthy();
    expect(screen.getByText("LEVEL UP · Lv.2")).toBeTruthy();
    const stored = JSON.parse(window.localStorage.getItem(PROGRESS_STORAGE_KEY) ?? "{}");
    expect(stored.completedMissions["mission-1"]).toBeTruthy();
    expect(getLevelSummary(stored)).toMatchObject({ xp: 100, level: 2 });
    expect(stored.activeAttempt).toBeNull();
  });

  it("explains that a failed attempt earns 0XP without removing previously earned XP", async () => {
    const user = userEvent.setup();
    const initial = createInitialProgress("재도전별", "2026-11-23T09:00:00.000Z");
    window.localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(initial));
    render(<ProgressProvider><QuestHarness /></ProgressProvider>);

    await user.click(await screen.findByRole("button", { name: "테스트 퀘스트 시작" }));
    const mission = getMissionById("mission-1");
    if (!mission) throw new Error("Test mission not found");
    for (let index = 0; index < 3; index += 1) {
      const choices = await screen.findAllByRole("radio");
      await user.click(choices[(mission.questions[index].correctIndex + 1) % 4]);
      await user.click(screen.getByRole("button", { name: "답안 제출" }));
      await screen.findByRole("heading", { name: "힌트를 확인하고 다시 선택해 보세요" });
      const retryButton = screen.getByRole("button", { name: "다시 제출" });
      expect(retryButton).toHaveProperty("disabled", true);
      await user.click(choices[(mission.questions[index].correctIndex + 2) % 4]);
      expect(retryButton).toHaveProperty("disabled", false);
      await user.click(screen.getByRole("button", { name: "다시 제출" }));
      await screen.findByText("오답입니다.");
      await user.click(screen.getByRole("button", { name: index === 2 ? "퀘스트 완료" : "다음 문항" }));
    }

    expect(await screen.findByRole("heading", { name: "통과 기준에 조금 못 미쳤어요" })).toBeTruthy();
    expect(screen.getByText(`${FAILED_ATTEMPT_REWARD_MESSAGE} 힌트와 해설을 떠올리며 바로 다시 도전해 보세요.`)).toBeTruthy();
    expect(getLevelSummary(JSON.parse(window.localStorage.getItem(PROGRESS_STORAGE_KEY) ?? "{}"))).toMatchObject({ xp: 0, level: 1 });
  });

  it("reports full campaign completion after the fifth mission reward", async () => {
    const user = userEvent.setup();
    let progress = createInitialProgress("완주별", "2026-11-23T09:00:00.000Z");
    MISSION_IDS.slice(0, 4).forEach((missionId, index) => {
      progress = completeMissionForSetup(progress, missionId, index * 20 + 1);
    });
    window.localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
    const onMissionComplete = vi.fn();
    render(<ProgressProvider><QuestHarness missionId="mission-5" onMissionComplete={onMissionComplete} /></ProgressProvider>);

    await user.click(await screen.findByRole("button", { name: "테스트 퀘스트 시작" }));
    const mission = getMissionById("mission-5");
    if (!mission) throw new Error("Test mission not found");
    for (let index = 0; index < 3; index += 1) {
      await user.click((await screen.findAllByRole("radio"))[mission.questions[index].correctIndex]);
      await user.click(screen.getByRole("button", { name: "답안 제출" }));
      await screen.findByText("정답입니다.");
      await user.click(screen.getByRole("button", { name: index === 2 ? "퀘스트 완료" : "다음 문항" }));
    }

    expect(onMissionComplete).toHaveBeenCalledTimes(1);
    const result = onMissionComplete.mock.calls[0][0] as CompletionResult;
    expect(result.xpAwarded).toBe(100);
    expect(hasCompletedAllMissions(result.progress)).toBe(true);
  });
});
