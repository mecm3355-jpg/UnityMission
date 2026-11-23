// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DialoguePanel } from "./dialogue-panel";
import { NPCS } from "../../game/npcs";
import type { CompletedMissions } from "../../types/progress";

afterEach(cleanup);

beforeEach(() => {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn(() => ({ matches: true })),
  });
});

describe("R04 NPC dialogue", () => {
  it("shows the NPC name, message, choices, and next action", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onStartQuest = vi.fn();
    render(<DialoguePanel completedMissions={{}} npc={NPCS[0]} onClose={onClose} onStartQuest={onStartQuest} playerName="평화별" />);

    expect(screen.getByRole("heading", { name: NPCS[0].name })).toBeTruthy();
    expect(screen.getByRole("status")).toHaveProperty("textContent", NPCS[0].greeting);
    await user.click(screen.getByRole("button", { name: "다음" }));
    expect(screen.getByRole("heading", { name: "평화별" })).toBeTruthy();
    expect(screen.getByRole("status")).toHaveProperty("textContent", NPCS[0].playerReply);
    await user.click(screen.getByRole("button", { name: "다음" }));
    expect(screen.getByRole("status")).toHaveProperty("textContent", NPCS[0].questPrompt);
    await user.click(screen.getByRole("button", { name: "퀘스트를 도울게요" }));
    expect(screen.getByRole("status")).toHaveProperty("textContent", expect.stringContaining("평화 조각"));
    await user.click(screen.getByRole("button", { name: "퀘스트 시작" }));
    expect(onStartQuest).toHaveBeenCalledWith("mission-1");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("changes the alternating dialogue for a completed quest", async () => {
    const user = userEvent.setup();
    const completedMissions: CompletedMissions = {
      "mission-1": { completedAt: "2026-11-23T10:00:00.000Z", bestCorrectCount: 3, attemptCount: 1 },
    };
    render(<DialoguePanel completedMissions={completedMissions} npc={NPCS[0]} onClose={vi.fn()} playerName="평화별" />);
    expect(screen.getByRole("heading", { name: "평화별" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "다음" }));
    expect(screen.getByRole("heading", { name: NPCS[0].name })).toBeTruthy();
    expect(screen.getByRole("status")).toHaveProperty("textContent", NPCS[0].completedMessage);
  });

  it("focuses the dialog and closes with Escape", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<DialoguePanel completedMissions={{}} npc={NPCS[0]} onClose={onClose} playerName="평화별" />);
    expect(document.activeElement).toBe(screen.getByRole("dialog"));
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
