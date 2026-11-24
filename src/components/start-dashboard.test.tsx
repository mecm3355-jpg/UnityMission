// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StartScreen } from "./home/start-screen";
import { DashboardView } from "./dashboard/dashboard-view";
import { ProgressProvider } from "../context/progress-context";
import { createInitialProgress } from "../lib/game-engine";
import { PROGRESS_STORAGE_KEY } from "../lib/progress-storage";

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

describe("start screen", () => {
  it("provides separate PDF downloads for players and developers", async () => {
    render(
      <ProgressProvider>
        <StartScreen />
      </ProgressProvider>,
    );

    const userManual = await screen.findByRole("link", { name: "사용자 매뉴얼 PDF" });
    const implementationGuide = screen.getByRole("link", { name: "구현 설명서 PDF" });

    expect(userManual.getAttribute("href")).toBe("/downloads/unitymission-user-manual-ko.pdf");
    expect(userManual.hasAttribute("download")).toBe(true);
    expect(implementationGuide.getAttribute("href")).toBe(
      "/downloads/unitymission-implementation-guide-ko.pdf",
    );
    expect(implementationGuide.hasAttribute("download")).toBe(true);
  });

  it("rejects a whitespace-only nickname", async () => {
    const user = userEvent.setup();
    render(
      <ProgressProvider>
        <StartScreen />
      </ProgressProvider>,
    );

    const input = await screen.findByLabelText("닉네임");
    await user.type(input, "   ");
    await user.click(screen.getByRole("button", { name: "모험 시작하기" }));

    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      "닉네임은 공백을 제외하고 2~12자로 입력해 주세요.",
    );
    expect(router.push).not.toHaveBeenCalled();
  });

  it("recovers malformed browser data and shows a safe warning", async () => {
    window.localStorage.setItem(PROGRESS_STORAGE_KEY, "{broken-json");
    render(
      <ProgressProvider>
        <StartScreen />
      </ProgressProvider>,
    );

    expect(
      await screen.findByText("저장된 학습 데이터가 손상되어 안전한 초기 상태로 복구했습니다."),
    ).toBeTruthy();
    expect(screen.getByRole("heading", { name: "닉네임으로 시작하기" })).toBeTruthy();
    expect(window.localStorage.getItem(PROGRESS_STORAGE_KEY)).toBeNull();
  });

  it("starts a new profile and routes to the RPG", async () => {
    const user = userEvent.setup();
    render(
      <ProgressProvider>
        <StartScreen />
      </ProgressProvider>,
    );

    const input = await screen.findByLabelText("닉네임");
    await user.type(input, "평화별");
    await user.click(screen.getByRole("button", { name: "모험 시작하기" }));

    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/game"));
    const stored = JSON.parse(window.localStorage.getItem(PROGRESS_STORAGE_KEY) ?? "{}");
    expect(stored.nickname).toBe("평화별");
  });

  it("keeps script-like nickname input length-limited and renders it only as text", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <ProgressProvider>
        <StartScreen />
      </ProgressProvider>,
    );

    const input = await screen.findByLabelText("닉네임");
    await user.type(input, "<script>alert(1)</script>");
    expect(input).toHaveProperty("value", "<script>aler");
    await user.click(screen.getByRole("button", { name: "모험 시작하기" }));

    expect(await screen.findByText("<script>aler님의 모험")).toBeTruthy();
    expect(container.querySelector("script")).toBeNull();
    expect(router.push).toHaveBeenCalledWith("/game");
  });

  it("reaches the nickname field and submit button in keyboard order", async () => {
    const user = userEvent.setup();
    render(
      <ProgressProvider>
        <StartScreen />
      </ProgressProvider>,
    );

    const input = await screen.findByLabelText("닉네임");
    await user.tab();
    expect(document.activeElement).toBe(input);
    await user.tab();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "모험 시작하기" }));
  });

  it("renders a restored nickname as text instead of HTML", async () => {
    const progress = createInitialProgress("<b>나</b>", "2026-11-23T09:00:00.000Z");
    window.localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));

    const { container } = render(
      <ProgressProvider>
        <StartScreen />
      </ProgressProvider>,
    );

    expect(await screen.findByText("<b>나</b>님의 모험")).toBeTruthy();
    expect(container.querySelector("b")).toBeNull();
    expect(screen.getByRole("link", { name: "평화마을 이어서 탐험하기" })).toHaveProperty("pathname", "/game");
    expect(screen.getByRole("link", { name: "기존 대시보드 보기" })).toHaveProperty("pathname", "/dashboard");
  });
});

describe("dashboard", () => {
  it("shows profile progress with only mission 1 available initially", async () => {
    const progress = createInitialProgress("평화별", "2026-11-23T09:00:00.000Z");
    window.localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
    render(
      <ProgressProvider>
        <DashboardView />
      </ProgressProvider>,
    );

    expect(await screen.findByText("평화별님")).toBeTruthy();
    expect(screen.getByText("0 XP")).toBeTruthy();
    expect(screen.getByRole("link", { name: /분단의 역사를 따라가요 미션 보기/ })).toBeTruthy();
    expect(screen.getAllByText("잠김")).toHaveLength(4);

    const progressBar = screen.getByRole("progressbar", { name: "전체 학습 진행률 0%" });
    expect(progressBar).toHaveProperty("value", 0);
  });

  it("clears a shared-device profile after explicit confirmation", async () => {
    const user = userEvent.setup();
    const progress = createInitialProgress("평화별", "2026-11-23T09:00:00.000Z");
    window.localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
    render(
      <ProgressProvider>
        <DashboardView />
      </ProgressProvider>,
    );

    await screen.findByText("평화별님");
    await user.click(screen.getByRole("button", { name: "기록 초기화" }));
    const confirmation = screen.getByRole("group", { name: "학습 기록 초기화 확인" });
    await user.click(within(confirmation).getByRole("button", { name: "모든 기록 초기화" }));

    expect(window.localStorage.getItem(PROGRESS_STORAGE_KEY)).toBeNull();
    expect(router.replace).toHaveBeenCalledWith("/");
  });
});
