import { writeFile } from "node:fs/promises";

const [port = "9232", url, outputPrefix = "document-preview", mode = "combined", pdfPath] = process.argv.slice(2);
if (!url) throw new Error("검증할 문서 URL이 필요합니다.");
if (!["combined", "user", "implementation"].includes(mode)) {
  throw new Error(`지원하지 않는 문서 모드입니다: ${mode}`);
}

const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) => response.json());
const target = targets.find((item) => item.type === "page");
if (!target) throw new Error("Chrome page target을 찾지 못했습니다.");

const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

let requestId = 0;
const pending = new Map();
socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (!message.id || !pending.has(message.id)) return;
  const { resolve, reject } = pending.get(message.id);
  pending.delete(message.id);
  if (message.error) reject(new Error(message.error.message));
  else resolve(message.result);
});

function send(method, params = {}) {
  requestId += 1;
  return new Promise((resolve, reject) => {
    pending.set(requestId, { resolve, reject });
    socket.send(JSON.stringify({ id: requestId, method, params }));
  });
}

async function evaluate(expression) {
  const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}

await send("Page.enable");
await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", {
  width: 703,
  height: 1100,
  deviceScaleFactor: 1,
  mobile: false,
});
await send("Emulation.setEmulatedMedia", { media: "print" });
await send("Page.navigate", { url });

const deadline = Date.now() + 20000;
while (Date.now() < deadline) {
  const ready = await evaluate(`document.readyState === "complete" && [...document.images].every((image) => image.complete)`);
  if (ready) break;
  await new Promise((resolve) => setTimeout(resolve, 200));
}

const summary = await evaluate(`(() => {
  const pages = [...document.querySelectorAll(".page")]
    .filter((page) => !page.hidden && getComputedStyle(page).display !== "none");
  return {
    title: document.title,
    pageCount: pages.length,
    bodyTextLength: document.body.innerText.length,
    hasKoreanTitle: document.body.innerText.includes("사용자 매뉴얼 및 구현 설명서"),
    hasUserPart: document.body.innerText.includes("1부 · 사용자 매뉴얼"),
    hasImplementationPart: document.body.innerText.includes("2부 · 구현 설명서"),
    images: [...document.images]
      .filter((image) => pages.some((page) => page.contains(image)))
      .map((image) => ({
      src: image.getAttribute("src"),
      complete: image.complete,
      naturalWidth: image.naturalWidth,
      naturalHeight: image.naturalHeight,
    })),
    pages: pages.map((page, index) => ({
      index,
      top: page.offsetTop,
      width: page.offsetWidth,
      height: page.offsetHeight,
      scrollHeight: page.scrollHeight,
      minHeight: Number.parseFloat(getComputedStyle(page).minHeight),
    })),
  };
})()`);

const expectations = {
  combined: { pageCount: 21, title: "사용자 매뉴얼 및 구현 설명서", user: true, implementation: true },
  user: { pageCount: 9, title: "사용자 매뉴얼", user: true, implementation: false },
  implementation: { pageCount: 11, title: "구현 설명서", user: false, implementation: true },
};
const expected = expectations[mode];
const failures = [];
if (summary.pageCount !== expected.pageCount) failures.push(`페이지 수: ${summary.pageCount}/${expected.pageCount}`);
if (!summary.title.includes(expected.title)) failures.push(`문서 제목: ${summary.title}`);
if (summary.hasUserPart !== expected.user) failures.push(`사용자 파트 표시: ${summary.hasUserPart}`);
if (summary.hasImplementationPart !== expected.implementation) failures.push(`구현 파트 표시: ${summary.hasImplementationPart}`);
for (const image of summary.images) {
  if (!image.complete || image.naturalWidth === 0 || image.naturalHeight === 0) {
    failures.push(`이미지 로드 실패: ${image.src}`);
  }
}
for (const page of summary.pages) {
  if (page.scrollHeight > page.minHeight + 1 || page.height > page.minHeight + 1) {
    failures.push(`페이지 ${page.index + 1} 넘침: ${page.scrollHeight}/${page.minHeight}`);
  }
}

const captureIndexes = [...new Set([0, Math.floor(summary.pages.length / 2), summary.pages.length - 1])];
for (const index of captureIndexes) {
  const page = summary.pages[index];
  if (!page) continue;
  const screenshot = await send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: true,
    clip: { x: 0, y: page.top, width: page.width, height: Math.min(page.height, 1100), scale: 1 },
  });
  await writeFile(`${outputPrefix}-${index + 1}.png`, Buffer.from(screenshot.data, "base64"));
}

if (pdfPath && failures.length === 0) {
  const pdf = await send("Page.printToPDF", {
    printBackground: true,
    preferCSSPageSize: true,
    displayHeaderFooter: false,
    marginTop: 0,
    marginBottom: 0,
    marginLeft: 0,
    marginRight: 0,
  });
  await writeFile(pdfPath, Buffer.from(pdf.data, "base64"));
}

socket.close();
const status = failures.length === 0 ? "PASS" : "FAIL";
process.stdout.write(`${JSON.stringify({ status, mode, failures, summary }, null, 2)}\n`);
if (failures.length > 0) process.exitCode = 1;
