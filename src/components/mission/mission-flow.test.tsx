// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { missions } from "../../content/missions";
import { ProgressProvider } from "../../context/progress-context";
import {
  advanceToNextQuestion,
  completeActiveAttempt,
  createInitialProgress,
  getXp,
  revealCurrentExplanation,
  startMissionAttempt,
  submitCurrentAnswer,
} from "../../lib/game-engine";
import { PROGRESS_STORAGE_KEY } from "../../lib/progress-storage";
import type { CorrectIndex } from "../../types/content";
import type { UnityMissionProgress } from "../../types/progress";
import { MissionDetail } from "./mission-detail";
import { MissionPlay } from "./mission-play";
import { MissionResult } from "./mission-result";

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => router,
}));

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  router.push.mockReset();
  router.replace.mockReset();
});

function storeProgress(progress: UnityMissionProgress) {
  window.localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
}

function completeAttempt(
  progress: UnityMissionProgress,
  answers: [CorrectIndex, CorrectIndex, CorrectIndex],
  timestamp: string,
) {
  let next = progress;
  for (let index = 0; index < 3; index += 1) {
    next = submitCurrentAnswer(next, answers[index], timestamp);
    next = revealCurrentExplanation(next, timestamp);
    if (index < 2) {
      next = advanceToNextQuestion(next, timestamp);
    }
  }
  return completeActiveAttempt(next, timestamp);
}

describe("mission route guards and start", () => {
  it("blocks direct access to a locked mission without revealing its content", async () => {
    storeProgress(createInitialProgress("평화별", "2026-11-23T09:00:00.000Z"));
    render(
      <ProgressProvider>
        <MissionDetail mission={missions[1]} />
      </ProgressProvider>,
    );

    expect(await screen.findByRole("heading", { name: "잠긴 미션입니다." })).toBeTruthy();
    expect(screen.queryByText(missions[1].background)).toBeNull();
    expect(screen.queryByRole("button", { name: "미션 시작하기" })).toBeNull();
  });

  it("blocks a locked mission play URL before rendering any question", async () => {
    storeProgress(createInitialProgress("평화별", "2026-11-23T09:00:00.000Z"));
    render(
      <ProgressProvider>
        <MissionPlay mission={missions[1]} />
      </ProgressProvider>,
    );

    expect(await screen.findByRole("heading", { name: "잠긴 미션입니다." })).toBeTruthy();
    expect(screen.queryByText(missions[1].questions[0].prompt)).toBeNull();
    expect(screen.queryByRole("radio")).toBeNull();
  });

  it("starts mission 1, persists the attempt, and routes to play", async () => {
    const user = userEvent.setup();
    storeProgress(createInitialProgress("평화별", "2026-11-23T09:00:00.000Z"));
    render(
      <ProgressProvider>
        <MissionDetail mission={missions[0]} />
      </ProgressProvider>,
    );

    await user.click(await screen.findByRole("button", { name: "미션 시작하기" }));

    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/mission/mission-1/play"));
    const stored = JSON.parse(window.localStorage.getItem(PROGRESS_STORAGE_KEY) ?? "{}");
    expect(stored.activeAttempt).toMatchObject({ missionId: "mission-1", currentIndex: 0 });
  });
});

describe("mission learning flow", () => {
  it("supports radio selection and submission with the keyboard", async () => {
    const user = userEvent.setup();
    const initial = createInitialProgress("평화별", "2026-11-23T09:00:00.000Z");
    storeProgress(startMissionAttempt(initial, "mission-1", "2026-11-23T09:01:00.000Z"));
    render(
      <ProgressProvider>
        <MissionPlay mission={missions[0]} />
      </ProgressProvider>,
    );

    await screen.findByRole("heading", { name: missions[0].questions[0].prompt });
    const firstOption = screen.getByRole("radio", { name: missions[0].questions[0].options[0] });
    const secondOption = screen.getByRole("radio", { name: missions[0].questions[0].options[1] });
    await user.tab();
    await user.tab();
    expect(document.activeElement).toBe(firstOption);
    await user.keyboard("[ArrowDown]");
    expect(document.activeElement).toBe(secondOption);
    expect(secondOption).toHaveProperty("checked", true);
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "답안 제출" }));
    await user.keyboard("[Enter]");
    expect(await screen.findByRole("heading", { name: /정답입니다.|오답입니다./ })).toBeTruthy();
  });

  it("allows an incorrect answer, shows its explanation and source, then completes all questions", async () => {
    const user = userEvent.setup();
    const initial = createInitialProgress("평화별", "2026-11-23T09:00:00.000Z");
    storeProgress(startMissionAttempt(initial, "mission-1", "2026-11-23T09:01:00.000Z"));
    render(
      <ProgressProvider>
        <MissionPlay mission={missions[0]} />
      </ProgressProvider>,
    );

    for (let index = 0; index < 3; index += 1) {
      const question = missions[0].questions[index];
      const selectedIndex =
        index === 0 ? (((question.correctIndex + 1) % 4) as CorrectIndex) : question.correctIndex;
      await screen.findByRole("heading", { name: question.prompt });
      await user.click(screen.getByRole("radio", { name: question.options[selectedIndex] }));

      const selectedState = JSON.parse(window.localStorage.getItem(PROGRESS_STORAGE_KEY) ?? "{}");
      expect(selectedState.activeAttempt.answers[index]).toBe(selectedIndex);

      await user.click(screen.getByRole("button", { name: "답안 제출" }));
      const feedbackHeading = await screen.findByRole("heading", {
        name: index === 0 ? "오답입니다." : "정답입니다.",
      });
      expect(document.activeElement).toBe(feedbackHeading.parentElement);
      const source = screen.getByRole("link", { name: /출처 확인:/ });
      expect(source).toHaveProperty("rel", "noopener noreferrer");

      await user.click(
        screen.getByRole("button", { name: index === 2 ? "미션 완료" : "다음 문항" }),
      );
    }

    await waitFor(() =>
      expect(router.push).toHaveBeenCalledWith(
        "/mission/mission-1/result?score=2&xp=100&first=1",
      ),
    );
    const stored = JSON.parse(window.localStorage.getItem(PROGRESS_STORAGE_KEY) ?? "{}");
    expect(stored.activeAttempt).toBeNull();
    expect(stored.completedMissions["mission-1"]).toMatchObject({
      bestCorrectCount: 2,
      attemptCount: 1,
    });
  });

  it("restores the current question and a selected answer after remount", async () => {
    const initial = createInitialProgress("평화별", "2026-11-23T09:00:00.000Z");
    let attempt = startMissionAttempt(initial, "mission-1", "2026-11-23T09:01:00.000Z");
    attempt = submitCurrentAnswer(attempt, missions[0].questions[0].correctIndex, "2026-11-23T09:02:00.000Z");
    attempt = revealCurrentExplanation(attempt, "2026-11-23T09:03:00.000Z");
    attempt = advanceToNextQuestion(attempt, "2026-11-23T09:04:00.000Z");
    attempt = submitCurrentAnswer(attempt, 2, "2026-11-23T09:05:00.000Z");
    storeProgress(attempt);

    render(
      <ProgressProvider>
        <MissionPlay mission={missions[0]} />
      </ProgressProvider>,
    );

    expect(await screen.findByRole("heading", { name: missions[0].questions[1].prompt })).toBeTruthy();
    expect(screen.getByText("문항 2/3")).toBeTruthy();
    expect(screen.getByRole("radio", { name: missions[0].questions[1].options[2] })).toHaveProperty(
      "checked",
      true,
    );
    expect(screen.getByRole("button", { name: "답안 제출" })).toHaveProperty("disabled", false);
  });

  it("awards zero duplicate XP on replay while updating the best score", async () => {
    const user = userEvent.setup();
    const mission = missions[0];
    const wrongAnswers = mission.questions.map(
      (question) => ((question.correctIndex + 1) % 4) as CorrectIndex,
    ) as [CorrectIndex, CorrectIndex, CorrectIndex];
    const correctAnswers = mission.questions.map((question) => question.correctIndex) as [
      CorrectIndex,
      CorrectIndex,
      CorrectIndex,
    ];
    const initial = createInitialProgress("평화별", "2026-11-23T09:00:00.000Z");
    const firstAttempt = startMissionAttempt(initial, mission.id, "2026-11-23T09:01:00.000Z");
    const firstCompletion = completeAttempt(firstAttempt, wrongAnswers, "2026-11-23T09:02:00.000Z");
    let replay = startMissionAttempt(firstCompletion.progress, mission.id, "2026-11-23T10:00:00.000Z");

    for (let index = 0; index < 3; index += 1) {
      replay = submitCurrentAnswer(replay, correctAnswers[index], "2026-11-23T10:01:00.000Z");
      replay = revealCurrentExplanation(replay, "2026-11-23T10:02:00.000Z");
      if (index < 2) {
        replay = advanceToNextQuestion(replay, "2026-11-23T10:03:00.000Z");
      }
    }
    storeProgress(replay);

    render(
      <ProgressProvider>
        <MissionPlay mission={mission} />
      </ProgressProvider>,
    );

    await user.click(await screen.findByRole("button", { name: "미션 완료" }));
    await waitFor(() =>
      expect(router.push).toHaveBeenCalledWith(
        "/mission/mission-1/result?score=3&xp=0&first=0",
      ),
    );

    const stored = JSON.parse(
      window.localStorage.getItem(PROGRESS_STORAGE_KEY) ?? "{}",
    ) as UnityMissionProgress;
    expect(getXp(stored.completedMissions)).toBe(100);
    expect(stored.completedMissions[mission.id]).toMatchObject({
      bestCorrectCount: 3,
      attemptCount: 2,
      completedAt: "2026-11-23T09:02:00.000Z",
    });
  });
});

describe("mission result", () => {
  it("shows the verified reward and the newly unlocked next mission", async () => {
    const mission = missions[0];
    const initial = createInitialProgress("평화별", "2026-11-23T09:00:00.000Z");
    const attempt = startMissionAttempt(initial, mission.id, "2026-11-23T09:01:00.000Z");
    const completion = completeAttempt(
      attempt,
      mission.questions.map((question) => question.correctIndex) as [
        CorrectIndex,
        CorrectIndex,
        CorrectIndex,
      ],
      "2026-11-23T09:02:00.000Z",
    );
    storeProgress(completion.progress);

    render(
      <ProgressProvider>
        <MissionResult firstParam="1" mission={mission} scoreParam="3" xpParam="100" />
      </ProgressProvider>,
    );

    expect(await screen.findByRole("heading", { name: `${mission.title} 완료` })).toBeTruthy();
    expect(screen.getByText("3/3")).toBeTruthy();
    expect(screen.getByText("+100 XP")).toBeTruthy();
    expect(screen.getByRole("link", { name: "다음 미션 보기" })).toHaveProperty(
      "href",
      expect.stringContaining("/mission/mission-2"),
    );
  });
});
