import { writeFile } from "node:fs/promises";

const [port = "9225", baseUrl = "http://127.0.0.1:3100", screenshotPath, desktopScreenshotPath, dialogueScreenshotPath] = process.argv.slice(2);
const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) => response.json());
const target = targets.find((item) => item.type === "page");

if (!target?.webSocketDebuggerUrl) throw new Error("Chrome DevTools page target를 찾지 못했습니다.");

const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

let nextId = 0;
const pending = new Map();
const runtimeErrors = [];

socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result);
  }
  if (message.method === "Runtime.exceptionThrown") runtimeErrors.push(message.params.exceptionDetails.text);
});

function send(method, params = {}) {
  const id = ++nextId;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

async function evaluate(expression) {
  const response = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.text);
  return response.result.value;
}

async function waitFor(expression, label, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      if (await evaluate(`Boolean(${expression})`)) return;
    } catch {
      // 페이지 전환 중 이전 실행 컨텍스트가 사라지는 순간은 재시도한다.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  const diagnostics = await evaluate(`(() => {
    const host = document.querySelector('[data-testid="phaser-game-container"]');
    return { url: location.href, text: document.body.innerText.slice(0, 1000), game: host ? { ...host.dataset } : null };
  })()`);
  throw new Error(`${label} 대기 시간 초과: ${JSON.stringify(diagnostics)}`);
}

async function holdKey(code, durationMs) {
  const keyCodes = { ArrowUp: 38, ArrowDown: 40, ArrowLeft: 37, ArrowRight: 39, KeyE: 69 };
  const keyCode = keyCodes[code];
  const key = code === "KeyE" ? "e" : code;
  await send("Input.dispatchKeyEvent", {
    type: "keyDown",
    key,
    code,
    windowsVirtualKeyCode: keyCode,
    nativeVirtualKeyCode: keyCode,
  });
  await new Promise((resolve) => setTimeout(resolve, durationMs));
  await send("Input.dispatchKeyEvent", {
    type: "keyUp",
    key,
    code,
    windowsVirtualKeyCode: keyCode,
    nativeVirtualKeyCode: keyCode,
  });
  await new Promise((resolve) => setTimeout(resolve, 150));
}

async function moveUntilText(text, code, maxSteps = 28) {
  for (let step = 0; step < maxSteps; step += 1) {
    if (await evaluate(`document.body.innerText.includes(${JSON.stringify(text)})`)) return;
    await holdKey(code, 110);
  }
  await waitFor(`document.body.innerText.includes(${JSON.stringify(text)})`, `${text} 이동`);
}

async function moveUntilAtMost(datasetKey, target, code, maxSteps = 30) {
  for (let step = 0; step < maxSteps; step += 1) {
    const value = Number(await evaluate(`document.querySelector('[data-testid="phaser-game-container"]').dataset[${JSON.stringify(datasetKey)}]`));
    if (value <= target) return;
    await holdKey(code, 110);
  }
  throw new Error(`${datasetKey} 좌표가 ${target} 이하에 도달하지 못했습니다.`);
}

async function moveUntilAtLeast(datasetKey, target, code, maxSteps = 30) {
  for (let step = 0; step < maxSteps; step += 1) {
    const value = Number(await evaluate(`document.querySelector('[data-testid="phaser-game-container"]').dataset[${JSON.stringify(datasetKey)}]`));
    if (value >= target) return;
    await holdKey(code, 110);
  }
  throw new Error(`${datasetKey} 좌표가 ${target} 이상에 도달하지 못했습니다.`);
}

async function clickButton(label) {
  const clicked = await evaluate(`(() => {
    const button = [...document.querySelectorAll("button")].find((item) =>
      item.textContent.trim() === ${JSON.stringify(label)} || item.getAttribute("aria-label") === ${JSON.stringify(label)}
    );
    if (!button) return false;
    button.click();
    return true;
  })()`);
  if (!clicked) throw new Error(`버튼을 찾지 못했습니다: ${label}`);
}

async function advanceDialogueUntilButton(targetLabel, maxSteps = 10) {
  for (let step = 0; step < maxSteps; step += 1) {
    const state = await evaluate(`(() => {
      const buttons = [...document.querySelectorAll("button")];
      const target = buttons.find((item) => item.textContent.trim() === ${JSON.stringify(targetLabel)} || item.getAttribute("aria-label") === ${JSON.stringify(targetLabel)});
      if (target) return { ready: true };
      const advance = buttons.find((item) => ["대사 모두 보기", "다음"].includes(item.textContent.trim()));
      if (!advance) return { ready: false, advanced: false };
      advance.click();
      return { ready: false, advanced: true };
    })()`);
    if (state.ready) return;
    if (!state.advanced) throw new Error(`대화 진행 버튼을 찾지 못했습니다: ${targetLabel}`);
    await new Promise((resolve) => setTimeout(resolve, 120));
  }
  throw new Error(`대화 목표 버튼에 도달하지 못했습니다: ${targetLabel}`);
}

async function advanceDialogueUntilText(targetText, maxSteps = 10) {
  for (let step = 0; step < maxSteps; step += 1) {
    if (await evaluate(`document.body.innerText.includes(${JSON.stringify(targetText)})`)) return;
    const advanced = await evaluate(`(() => {
      const button = [...document.querySelectorAll("button")].find((item) => ["대사 모두 보기", "다음"].includes(item.textContent.trim()));
      if (!button) return false;
      button.click();
      return true;
    })()`);
    if (!advanced) throw new Error(`대화 문구 진행 버튼을 찾지 못했습니다: ${targetText}`);
    await new Promise((resolve) => setTimeout(resolve, 120));
  }
  throw new Error(`대화 문구에 도달하지 못했습니다: ${targetText}`);
}

async function holdPointerButton(label, durationMs) {
  const point = await evaluate(`(() => {
    const button = [...document.querySelectorAll("button")].find((item) => item.getAttribute("aria-label") === ${JSON.stringify(label)});
    if (!button) return null;
    const rect = button.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  })()`);
  if (!point) throw new Error(`모바일 버튼을 찾지 못했습니다: ${label}`);
  await evaluate(`(() => {
    const button = [...document.querySelectorAll("button")].find((item) => item.getAttribute("aria-label") === ${JSON.stringify(label)});
    button.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 1, pointerType: "touch", isPrimary: true }));
  })()`);
  await new Promise((resolve) => setTimeout(resolve, durationMs));
  await evaluate(`(() => {
    const button = [...document.querySelectorAll("button")].find((item) => item.getAttribute("aria-label") === ${JSON.stringify(label)});
    button.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 1, pointerType: "touch", isPrimary: true }));
    button.click();
  })()`);
  await new Promise((resolve) => setTimeout(resolve, 150));
}

async function moveMobileUntilText(text, buttonLabel, startX, minDelta = 70, maxSteps = 16) {
  for (let step = 0; step < maxSteps; step += 1) {
    const state = await evaluate(`(() => ({
      textReady: document.body.innerText.includes(${JSON.stringify(text)}),
      x: Number(document.querySelector('[data-testid="phaser-game-container"]').dataset.playerX)
    }))()`);
    if (state.textReady && state.x > startX + minDelta) return state.x;
    await holdPointerButton(buttonLabel, 140);
  }
  await waitFor(`document.body.innerText.includes(${JSON.stringify(text)})`, `${text} 모바일 이동`);
  return Number(await evaluate(`document.querySelector('[data-testid="phaser-game-container"]').dataset.playerX`));
}

await send("Page.enable");
await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", {
  width: 960,
  height: 720,
  deviceScaleFactor: 1,
  mobile: false,
});
await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });

await send("Page.navigate", { url: `${baseUrl}/` });
await waitFor(`document.readyState === "complete"`, "브라우저 저장소 초기화 화면");
await evaluate(`localStorage.clear()`);
await send("Page.navigate", { url: `${baseUrl}/game` });
await waitFor(`document.body.innerText.includes("모험 기록이 필요합니다")`, "프로필 가드");
await send("Page.navigate", { url: `${baseUrl}/` });
await waitFor(`document.querySelector('#nickname') && document.body.innerText.includes("2D 픽셀 RPG")`, "RPG 시작 화면");
await evaluate(`(() => {
  const input = document.querySelector("#nickname");
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
  setter.call(input, "브라우저탐험가");
  input.dispatchEvent(new Event("input", { bubbles: true }));
})()`);
await clickButton("모험 시작하기");
await waitFor(`location.pathname === "/game"`, "메인에서 RPG 진입");

await waitFor(`document.querySelector("canvas")`, "Phaser 캔버스 생성", 20000);
await waitFor(`document.body.innerText.includes("평화마을 게임 화면이 준비되었습니다")`, "게임 준비 상태", 20000);
await waitFor(`document.querySelector('[data-testid="phaser-game-container"]')?.dataset.gameReady === "true"`, "Phaser 장면 준비", 20000);

const startX = Number(await evaluate(`document.querySelector('[data-testid="phaser-game-container"]').dataset.playerX`));
await moveUntilAtLeast("playerX", startX + 80, "ArrowRight");
const movedX = Number(await evaluate(`document.querySelector('[data-testid="phaser-game-container"]').dataset.playerX`));
if (movedX <= startX + 70) throw new Error(`오른쪽 이동이 확인되지 않았습니다: ${startX} -> ${movedX}`);

await send("Page.navigate", { url: `${baseUrl}/game` });
await waitFor(`document.querySelector('[data-testid="phaser-game-container"]')?.dataset.gameReady === "true"`, "충돌 검증 장면 준비", 20000);
await holdKey("ArrowUp", 1200);
const collision = await evaluate(`(() => {
  const data = document.querySelector('[data-testid="phaser-game-container"]').dataset;
  return { y: Number(data.playerY), count: Number(data.collisionCount), facing: data.facing };
})()`);
if (collision.y < 640 || collision.y > 670 || collision.facing !== "up") {
  throw new Error(`광장 분수 충돌이 확인되지 않았습니다: ${JSON.stringify(collision)}`);
}

await send("Page.navigate", { url: `${baseUrl}/game` });
await waitFor(`document.querySelector('[data-testid="phaser-game-container"]')?.dataset.gameReady === "true"`, "NPC 검증 장면 준비", 20000);
await moveUntilAtMost("playerX", 575, "ArrowLeft");
await moveUntilAtMost("playerY", 500, "ArrowUp");
await waitFor(`document.body.innerText.includes("E 키: 역사 안내자와 대화하기")`, "NPC 근접 프롬프트");
const npcX = Number(await evaluate(`document.querySelector('[data-testid="phaser-game-container"]').dataset.playerX`));
await holdKey("KeyE", 80);
await waitFor(`document.querySelector('[role="dialog"]') && document.body.innerText.includes("기록이")`, "NPC 대화창");
await waitFor(`document.querySelector('[data-testid="phaser-game-container"]').dataset.paused === "true"`, "대화 중 이동 잠금");
await holdKey("ArrowRight", 500);
const pausedX = Number(await evaluate(`document.querySelector('[data-testid="phaser-game-container"]').dataset.playerX`));
if (Math.abs(pausedX - npcX) > 2) throw new Error(`대화 중 플레이어가 이동했습니다: ${npcX} -> ${pausedX}`);
await advanceDialogueUntilButton("퀘스트를 도울게요");
if (dialogueScreenshotPath) {
  const dialogueScreenshot = await send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
  });
  await writeFile(dialogueScreenshotPath, Buffer.from(dialogueScreenshot.data, "base64"));
}
await clickButton("퀘스트를 도울게요");
await advanceDialogueUntilButton("퀘스트 시작");
await clickButton("퀘스트 시작");
await waitFor(`document.body.innerText.includes("문항 1/3")`, "교육 퀘스트 시작");

for (let questionIndex = 0; questionIndex < 3; questionIndex += 1) {
  await evaluate(`document.querySelector('input[type="radio"]').click()`);
  await clickButton("답안 제출");
  await waitFor(`document.body.innerText.includes("출처 확인:")`, `문항 ${questionIndex + 1} 해설`);
  await clickButton(questionIndex === 2 ? "퀘스트 완료" : "다음 문항");
}

await waitFor(`document.body.innerText.includes("QUEST COMPLETE")`, "퀘스트 완료 연출");
await waitFor(`document.body.innerText.includes("+100 XP")`, "최초 완료 보상");
const questProgress = await evaluate(`JSON.parse(localStorage.getItem("unitymission:v1"))`);
if (!questProgress.completedMissions["mission-1"] || questProgress.activeAttempt !== null) {
  throw new Error(`공유 진행 저장이 올바르지 않습니다: ${JSON.stringify(questProgress)}`);
}
await clickButton("마을로 돌아가기");
await waitFor(`!document.body.innerText.includes("QUEST COMPLETE")`, "게임 복귀");
await waitFor(`document.body.innerText.includes("Lv.2 · 100XP")`, "공유 XP 헤더 갱신");

await holdKey("KeyE", 80);
await advanceDialogueUntilText("역사 조각이 광장을 밝히고 있어요");
await advanceDialogueUntilButton("대화 마치기");
await waitFor(`document.body.innerText.includes("함께 만든 변화를 기억하면서")`, "완료 NPC 반응");
await clickButton("대화 마치기");
await waitFor(`!document.querySelector('[role="dialog"]')`, "완료 대화 닫기");

await send("Page.navigate", { url: `${baseUrl}/game` });
await waitFor(`document.querySelector('[data-testid="phaser-game-container"]')?.dataset.gameReady === "true"`, "환경 퍼즐 장면 준비", 20000);
await moveUntilAtLeast("playerY", 820, "ArrowDown");
await moveUntilText("E 키: 푸른 공명석 상호작용", "ArrowRight");
await holdKey("KeyE", 80);
await waitFor(`document.body.innerText.includes("공명석이 빛났습니다")`, "첫 공명석 활성화");
await moveUntilText("E 키: 황금 공명석 상호작용", "ArrowRight", 12);
await holdKey("KeyE", 80);
await moveUntilText("E 키: 초록 공명석 상호작용", "ArrowRight", 12);
await holdKey("KeyE", 80);
await waitFor(`document.body.innerText.includes("환경 퍼즐 완료")`, "공명석 퍼즐 완료");
const rpgProgress = await evaluate(`JSON.parse(localStorage.getItem("unitymission:rpg:v1"))`);
if (!rpgProgress.puzzleSolved || !rpgProgress.harmonyKey) {
  throw new Error(`환경 퍼즐 저장이 올바르지 않습니다: ${JSON.stringify(rpgProgress)}`);
}
await clickButton("🎒 조각 1/5");
await waitFor(`document.body.innerText.includes("조화의 열쇠: 획득")`, "인벤토리 퍼즐 보상");

await evaluate(`(() => {
  const progress = JSON.parse(localStorage.getItem("unitymission:v1"));
  const now = new Date().toISOString();
  for (let index = 1; index <= 5; index += 1) {
    progress.completedMissions["mission-" + index] ??= { completedAt: now, bestCorrectCount: 3, attemptCount: 1 };
  }
  progress.updatedAt = now;
  localStorage.setItem("unitymission:v1", JSON.stringify(progress));
})()`);
await send("Page.navigate", { url: `${baseUrl}/game` });
await waitFor(`document.querySelector('[data-testid="phaser-game-container"]')?.dataset.gameReady === "true"`, "엔딩 장면 준비", 20000);
await waitFor(`document.body.innerText.includes("Lv.6 · 500XP")`, "최종 레벨 공유");
await moveUntilText("E 키: 평화의 나무 상호작용", "ArrowRight", 12);
await holdKey("KeyE", 80);
await waitFor(`document.body.innerText.includes("평화마을이 다시 빛납니다")`, "최종 엔딩");
await waitFor(`document.body.innerText.includes("최종 레벨 Lv.6")`, "엔딩 최종 레벨");
await waitFor(`document.querySelector('a[href="/certificate"]')`, "엔딩 수료증 접근");
const endingProgress = await evaluate(`JSON.parse(localStorage.getItem("unitymission:rpg:v1"))`);
if (!endingProgress.endingSeen) throw new Error("엔딩 상태가 저장되지 않았습니다.");
await clickButton("다시 탐험하기");
await waitFor(`!document.body.innerText.includes("평화마을이 다시 빛납니다")`, "엔딩 후 재탐험");

if (desktopScreenshotPath) {
  const desktopScreenshot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  await writeFile(desktopScreenshotPath, Buffer.from(desktopScreenshot.data, "base64"));
}

await send("Emulation.setDeviceMetricsOverride", {
  width: 360,
  height: 740,
  deviceScaleFactor: 1,
  mobile: true,
});
await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
await send("Page.navigate", { url: `${baseUrl}/game` });
await waitFor(`document.querySelector('[data-testid="phaser-game-container"]')?.dataset.gameReady === "true"`, "모바일 게임 장면 준비", 20000);
await waitFor(`document.querySelector('[data-testid="phaser-game-container"]')?.dataset.reducedMotion === "true"`, "모션 감소 설정");
await waitFor(`document.querySelector('button[aria-label="오른쪽으로 이동"]')`, "모바일 방향키");
const mobileStartX = Number(await evaluate(`document.querySelector('[data-testid="phaser-game-container"]').dataset.playerX`));
const mobileMovedX = await moveMobileUntilText("E 키: 평화의 나무 상호작용", "오른쪽으로 이동", mobileStartX);
if (mobileMovedX <= mobileStartX + 70) throw new Error(`모바일 오른쪽 이동이 확인되지 않았습니다: ${mobileStartX} -> ${mobileMovedX}`);
await holdPointerButton("상호작용", 100);
await waitFor(`document.body.innerText.includes("평화마을이 다시 빛납니다")`, "모바일 상호작용 엔딩");
await clickButton("다시 탐험하기");
const mobileLayout = await evaluate(`({ innerWidth: window.innerWidth, scrollWidth: document.documentElement.scrollWidth })`);
if (mobileLayout.innerWidth !== 360 || mobileLayout.scrollWidth !== 360) throw new Error(`모바일 가로 넘침이 있습니다: ${JSON.stringify(mobileLayout)}`);

const result = await evaluate(`(() => {
  const canvas = document.querySelector("canvas");
  return {
    url: location.href,
    canvasWidth: canvas?.width ?? 0,
    canvasHeight: canvas?.height ?? 0,
    header: document.querySelector("h1")?.textContent ?? "",
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth
  };
})()`);
result.movement = { startX, movedX };
result.collision = collision;
result.npcInteraction = { npcX, pausedX, movementLocked: Math.abs(pausedX - npcX) <= 2 };
result.quest = { missionId: "mission-1", xp: 100, completed: true, restoredNpcReaction: true };
result.puzzle = { order: rpgProgress.puzzleSequence, solved: rpgProgress.puzzleSolved, harmonyKey: rpgProgress.harmonyKey };
result.ending = { fragments: 5, level: 6, certificateLink: true, endingSeen: endingProgress.endingSeen };
result.mobile = { startX: mobileStartX, movedX: mobileMovedX, interaction: true, reducedMotion: true, ...mobileLayout };

if (result.canvasWidth !== 960 || result.canvasHeight !== 540) {
  throw new Error(`예상하지 못한 Phaser 캔버스 크기: ${JSON.stringify(result)}`);
}

if (screenshotPath) {
  const screenshot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  await writeFile(screenshotPath, Buffer.from(screenshot.data, "base64"));
}

console.log(JSON.stringify({ status: "PASS", result, runtimeErrors }, null, 2));
socket.close();
