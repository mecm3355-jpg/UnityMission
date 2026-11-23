// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createInitialRpgProgress } from "../../game/rpg-progress";
import { EndingPanel } from "./ending-panel";
import { RpgHud } from "./rpg-hud";

afterEach(cleanup);

describe("R06 inventory and ending UI", () => {
  it("shows mission-derived fragments and the puzzle reward in the inventory", async () => {
    const user = userEvent.setup();
    render(<RpgHud fragmentCount={3} progress={{ ...createInitialRpgProgress(), puzzleSequence: ["blue", "gold", "green"], puzzleSolved: true, harmonyKey: true }} />);
    await user.click(screen.getByRole("button", { name: "🎒 조각 3/5" }));
    expect(screen.getByRole("heading", { name: "아이템 인벤토리" })).toBeTruthy();
    expect(screen.getByText("평화 조각: 3 / 5")).toBeTruthy();
    expect(screen.getByText("조화의 열쇠: 획득")).toBeTruthy();
  });

  it("offers the certificate and can return to exploration", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<EndingPanel level={6} nickname="평화별" onClose={onClose} />);
    expect(screen.getByRole("heading", { name: "평화마을이 다시 빛납니다" })).toBeTruthy();
    expect(screen.getByText("최종 레벨 Lv.6")).toBeTruthy();
    expect(screen.getByRole("link", { name: "비공식 수료증 보기" })).toHaveProperty("pathname", "/certificate");
    await user.click(screen.getByRole("button", { name: "다시 탐험하기" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
