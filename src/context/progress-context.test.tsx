// @vitest-environment jsdom

import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProgressProvider, useProgress } from "./progress-context";
import { PROGRESS_STORAGE_KEY } from "../lib/progress-storage";

function ContextHarness() {
  const { isHydrated, progress, warning, startNewProgress, clearProgress } = useProgress();

  if (!isHydrated) {
    return <p>loading</p>;
  }

  return (
    <div>
      <p data-testid="nickname">{progress?.nickname ?? "no-profile"}</p>
      <p data-testid="warning">{warning?.code ?? "no-warning"}</p>
      <button onClick={() => startNewProgress("평화별")} type="button">
        start
      </button>
      <button onClick={clearProgress} type="button">
        clear
      </button>
    </div>
  );
}

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("ProgressProvider", () => {
  it("creates, persists, and restores a new learner profile", async () => {
    const user = userEvent.setup();
    const firstRender = render(
      <ProgressProvider>
        <ContextHarness />
      </ProgressProvider>,
    );

    expect(await screen.findByText("no-profile")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "start" }));
    expect(await screen.findByText("평화별")).toBeTruthy();

    const stored = window.localStorage.getItem(PROGRESS_STORAGE_KEY);
    expect(stored).not.toBeNull();
    expect(JSON.parse(stored ?? "{}").nickname).toBe("평화별");

    firstRender.unmount();
    render(
      <ProgressProvider>
        <ContextHarness />
      </ProgressProvider>,
    );
    expect(await screen.findByText("평화별")).toBeTruthy();
  });

  it("recovers corrupted storage and exposes a user-facing warning", async () => {
    window.localStorage.setItem(PROGRESS_STORAGE_KEY, "{broken-json");
    render(
      <ProgressProvider>
        <ContextHarness />
      </ProgressProvider>,
    );

    expect(await screen.findByText("no-profile")).toBeTruthy();
    expect(screen.getByTestId("warning").textContent).toBe("corrupt-data-reset");
    expect(window.localStorage.getItem(PROGRESS_STORAGE_KEY)).toBeNull();
  });

  it("clears persistent and in-memory progress", async () => {
    const user = userEvent.setup();
    render(
      <ProgressProvider>
        <ContextHarness />
      </ProgressProvider>,
    );

    await screen.findByText("no-profile");
    await user.click(screen.getByRole("button", { name: "start" }));
    await screen.findByText("평화별");
    await user.click(screen.getByRole("button", { name: "clear" }));

    await waitFor(() => expect(screen.getByTestId("nickname").textContent).toBe("no-profile"));
    expect(window.localStorage.getItem(PROGRESS_STORAGE_KEY)).toBeNull();
  });
});
