import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn, spawnSync } from "node:child_process";

const projectRoot = process.cwd();
const nextBin = join(projectRoot, "node_modules", "next", "dist", "bin", "next");
const smokeScript = join(projectRoot, "scripts", "rpg-browser-smoke.mjs");

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    process.platform === "win32" && process.env.PROGRAMFILES
      ? join(process.env.PROGRAMFILES, "Google", "Chrome", "Application", "chrome.exe")
      : null,
    process.platform === "win32" && process.env["PROGRAMFILES(X86)"]
      ? join(process.env["PROGRAMFILES(X86)"], "Google", "Chrome", "Application", "chrome.exe")
      : null,
    process.platform === "win32" && process.env.LOCALAPPDATA
      ? join(process.env.LOCALAPPDATA, "Google", "Chrome", "Application", "chrome.exe")
      : null,
    process.platform === "darwin" ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" : null,
    process.platform === "linux" ? "/usr/bin/google-chrome" : null,
    process.platform === "linux" ? "/usr/bin/chromium" : null,
  ].filter(Boolean);

  const chrome = candidates.find((candidate) => existsSync(candidate));
  if (!chrome) {
    throw new Error("Chrome을 찾지 못했습니다. CHROME_PATH 환경 변수에 실행 파일 경로를 지정해 주세요.");
  }
  return chrome;
}

async function getAvailablePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : null;
      server.close((error) => {
        if (error) reject(error);
        else if (port === null) reject(new Error("사용 가능한 포트를 찾지 못했습니다."));
        else resolve(port);
      });
    });
  });
}

async function waitForUrl(url, label, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // 프로세스가 준비될 때까지 짧게 재시도한다.
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`${label} 준비 시간을 초과했습니다: ${url}`);
}

function terminateProcessTree(child) {
  if (!child?.pid || child.exitCode !== null) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    child.kill("SIGTERM");
  }
}

function runNodeScript(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { cwd: projectRoot, stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`브라우저 스모크가 종료코드 ${code ?? "unknown"}로 실패했습니다.`));
    });
  });
}

const appPort = await getAvailablePort();
const debugPort = await getAvailablePort();
const baseUrl = `http://127.0.0.1:${appPort}`;
const profileDir = await mkdtemp(join(tmpdir(), "unitymission-e2e-"));
let serverProcess;
let chromeProcess;

try {
  serverProcess = spawn(
    process.execPath,
    [nextBin, "start", "-H", "127.0.0.1", "-p", String(appPort)],
    { cwd: projectRoot, env: { ...process.env, NODE_ENV: "production" }, stdio: "inherit" },
  );
  await waitForUrl(baseUrl, "Next.js production 서버");

  chromeProcess = spawn(
    findChrome(),
    [
      "--headless=new",
      `--remote-debugging-port=${debugPort}`,
      `--user-data-dir=${profileDir}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-background-networking",
      "--window-size=1440,900",
      baseUrl,
    ],
    { stdio: "ignore" },
  );
  await waitForUrl(`http://127.0.0.1:${debugPort}/json/version`, "Chrome DevTools");
  await runNodeScript([smokeScript, String(debugPort), baseUrl]);
} finally {
  terminateProcessTree(chromeProcess);
  terminateProcessTree(serverProcess);
  await rm(profileDir, { recursive: true, force: true });
}
