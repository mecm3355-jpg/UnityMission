// @vitest-environment jsdom

import { afterEach, describe, expect, it } from "vitest";
import { useState } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { getMissionById } from "../../content/missions";
import { ProgressProvider, useProgress } from "../../context/progress-context";
import { createInitialProgress, getLevelSummary } from "../../lib/game-engine";
import { PROGRESS_STORAGE_KEY } from "../../lib/progress-storage";
import { RpgQuestPanel } from "./rpg-quest-panel";

function QuestHarness() {
  const { beginMission, progress } = useProgress();
  const [started, setStarted] = useState(false);
  if (!progress) return null;
  if (!started) {
    return (
      <button
        onClick={() => {
          beginMission("mission-1");
          setStarted(true);
        }}
        type="button"
      >
        테스트 퀘스트 시작
      </button>
    );
  }
  return <RpgQuestPanel missionId="mission-1" onClose={() => undefined} />;
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
      }
      await user.click(choices[mission.questions[index].correctIndex]);
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
});
