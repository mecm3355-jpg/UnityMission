// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { missions } from "../content/missions";
import { ProgressProvider } from "../context/progress-context";
import {
  advanceToNextQuestion,
  completeActiveAttempt,
  createInitialProgress,
  revealCurrentExplanation,
  startMissionAttempt,
  submitCurrentAnswer,
} from "../lib/game-engine";
import { PROGRESS_STORAGE_KEY } from "../lib/progress-storage";
import type { UnityMissionProgress } from "../types/progress";
import { BadgesView } from "./badges/badges-view";
import { CertificateView } from "./certificate/certificate-view";

const BASE_TIME = Date.parse("2026-11-23T09:00:00.000Z");

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  vi.restoreAllMocks();
});

function timestamp(step: number): string {
  return new Date(BASE_TIME + step * 60_000).toISOString();
}

function buildProgress(completedCount: number, nickname = "평화별"): UnityMissionProgress {
  let progress = createInitialProgress(nickname, timestamp(0));
  let step = 1;

  for (let missionIndex = 0; missionIndex < completedCount; missionIndex += 1) {
    const mission = missions[missionIndex];
    progress = startMissionAttempt(progress, mission.id, timestamp(step));
    step += 1;

    mission.questions.forEach((question, questionIndex) => {
      progress = submitCurrentAnswer(progress, question.correctIndex, timestamp(step));
      step += 1;
      progress = revealCurrentExplanation(progress, timestamp(step));
      step += 1;
      if (questionIndex < 2) {
        progress = advanceToNextQuestion(progress, timestamp(step));
        step += 1;
      }
    });

    progress = completeActiveAttempt(progress, timestamp(step)).progress;
    step += 1;
  }

  return progress;
}

function storeProgress(progress: UnityMissionProgress) {
  window.localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
}

describe("badges view", () => {
  it("shows five locked badges before any mission completion", async () => {
    storeProgress(buildProgress(0));
    render(
      <ProgressProvider>
        <BadgesView />
      </ProgressProvider>,
    );

    expect(await screen.findByRole("heading", { name: "나의 평화 학습 배지" })).toBeTruthy();
    expect(screen.getAllByText("잠김")).toHaveLength(5);
    expect(screen.getByText("현재 0/5개를 획득했습니다.", { exact: false })).toBeTruthy();
  });

  it("derives acquired badges and dates from completed missions", async () => {
    storeProgress(buildProgress(2));
    render(
      <ProgressProvider>
        <BadgesView />
      </ProgressProvider>,
    );

    expect(await screen.findByText("현재 2/5개를 획득했습니다.", { exact: false })).toBeTruthy();
    expect(screen.getAllByText("획득")).toHaveLength(2);
    expect(screen.getAllByText("잠김")).toHaveLength(3);
    expect(screen.getByLabelText("역사 길잡이 배지 획득")).toBeTruthy();
    expect(screen.getByLabelText("평화 대화가 배지 잠김")).toBeTruthy();
    expect(screen.getAllByText(/획득일:/)).toHaveLength(2);
  });
});

describe("certificate access and printing", () => {
  it("blocks the certificate content until all five missions are complete", async () => {
    storeProgress(buildProgress(4));
    render(
      <ProgressProvider>
        <CertificateView />
      </ProgressProvider>,
    );

    expect(await screen.findByRole("heading", { name: "수료증은 아직 잠겨 있습니다." })).toBeTruthy();
    expect(screen.getByText(/현재 4\/5개 미션을 완료했습니다/)).toBeTruthy();
    expect(screen.queryByText("비공식 학습 참여 확인서")).toBeNull();
    expect(screen.queryByRole("button", { name: "인쇄 또는 PDF로 저장" })).toBeNull();
  });

  it("renders a non-official certificate and calls the browser print dialog after completion", async () => {
    const user = userEvent.setup();
    const printSpy = vi.spyOn(window, "print").mockImplementation(() => undefined);
    storeProgress(buildProgress(5, "<b>나</b>"));
    const { container } = render(
      <ProgressProvider>
        <CertificateView />
      </ProgressProvider>,
    );

    expect(await screen.findByRole("heading", { name: "통일·평화교육 미션 완료" })).toBeTruthy();
    expect(screen.getByText("<b>나</b>")).toBeTruthy();
    expect(container.querySelector("b")).toBeNull();
    expect(screen.getByText("5개")).toBeTruthy();
    expect(screen.getByText("500 XP")).toBeTruthy();
    expect(screen.getByText("Lv.6")).toBeTruthy();
    expect(screen.getByText(/비공식 학습 참여 확인용/)).toBeTruthy();
    expect(screen.getByText(/완료일: 2026년 11월 23일/)).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "인쇄 또는 PDF로 저장" }));
    expect(printSpy).toHaveBeenCalledOnce();
  });
});
