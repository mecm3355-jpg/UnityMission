"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useProgress } from "../../context/progress-context";
import { getLevelSummary, normalizeNickname } from "../../lib/game-engine";
import { StorageWarning } from "../storage-warning";

export function StartScreen() {
  const router = useRouter();
  const { isHydrated, progress, warning, startNewProgress } = useProgress();
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      const normalizedNickname = normalizeNickname(nickname);
      startNewProgress(normalizedNickname);
      router.push("/dashboard");
    } catch {
      setError("닉네임은 공백을 제외하고 2~12자로 입력해 주세요.");
    }
  }

  if (!isHydrated) {
    return (
      <main className="mx-auto flex min-h-screen max-w-5xl items-center px-5 py-12 sm:px-8">
        <p className="text-lg text-slate-300" role="status">
          저장된 학습 기록을 확인하고 있습니다.
        </p>
      </main>
    );
  }

  const levelSummary = progress ? getLevelSummary(progress) : null;
  const displayNewForm = !progress || showNewForm;

  return (
    <main className="mx-auto grid min-h-screen max-w-6xl content-center gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[1.2fr_0.8fr] lg:gap-16">
      <section aria-labelledby="home-title" className="flex flex-col justify-center">
        <p className="text-sm font-bold tracking-[0.22em] text-[#F5C968]">UNITYMISSION</p>
        <h1 id="home-title" className="mt-4 max-w-3xl text-4xl font-bold leading-tight sm:text-6xl">
          평화를 배우는
          <span className="block text-[#F5C968]">다섯 가지 미션</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
          역사, 일상, 갈등 해결, 협력, 미래를 차례대로 살펴보며 나만의 학습 기록을
          완성해 보세요.
        </p>
        <ul className="mt-8 grid gap-3 text-base text-slate-200 sm:grid-cols-3">
          <li className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">5개 학습 미션</li>
          <li className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">15개 교육 문항</li>
          <li className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">브라우저 자동 저장</li>
        </ul>
      </section>

      <section
        aria-labelledby="start-title"
        className="rounded-3xl border border-white/10 bg-[#152448] p-6 shadow-2xl shadow-black/20 sm:p-8"
      >
        <StorageWarning warning={warning} />

        {progress && !displayNewForm ? (
          <div className="mt-2">
            <p className="text-base text-slate-300">다시 만나 반가워요.</p>
            <h2 id="start-title" className="mt-2 text-3xl font-bold">
              {progress.nickname}님의 학습
            </h2>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-[#0D1730] p-4">
                <p className="text-sm text-slate-400">현재 레벨</p>
                <p className="mt-1 text-lg font-bold text-[#F5C968]">Lv.{levelSummary?.level}</p>
              </div>
              <div className="rounded-xl bg-[#0D1730] p-4">
                <p className="text-sm text-slate-400">경험치</p>
                <p className="mt-1 text-lg font-bold">{levelSummary?.xp} / 500 XP</p>
              </div>
            </div>
            <Link
              className="mt-6 block rounded-xl bg-[#F5C968] px-5 py-3 text-center text-base font-bold text-[#0D1730] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F5C968]"
              href="/dashboard"
            >
              이어서 학습하기
            </Link>
            <button
              className="mt-3 w-full rounded-xl border border-white/20 px-5 py-3 text-base font-semibold hover:border-[#F5C968] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F5C968]"
              onClick={() => setShowNewForm(true)}
              type="button"
            >
              새 학습 시작하기
            </button>
          </div>
        ) : (
          <form className="mt-2" onSubmit={handleSubmit}>
            <h2 id="start-title" className="text-2xl font-bold">
              {progress ? "새 학습 기록 만들기" : "닉네임으로 시작하기"}
            </h2>
            <p className="mt-3 text-base leading-7 text-slate-300">
              회원가입 없이 이 브라우저에만 학습 기록을 저장합니다.
            </p>
            {progress ? (
              <p className="mt-4 rounded-xl border border-rose-300/40 bg-rose-300/10 px-4 py-3 text-base text-rose-100">
                새로 시작하면 현재 학습 기록을 덮어씁니다.
              </p>
            ) : null}
            <label className="mt-6 block text-base font-semibold" htmlFor="nickname">
              닉네임
            </label>
            <input
              aria-describedby={error ? "nickname-error nickname-help" : "nickname-help"}
              aria-invalid={error ? true : undefined}
              autoComplete="nickname"
              className="mt-2 w-full rounded-xl border border-white/20 bg-[#0D1730] px-4 py-3 text-base text-white outline-none placeholder:text-slate-500 focus:border-[#F5C968] focus:ring-2 focus:ring-[#F5C968]/30"
              id="nickname"
              maxLength={12}
              minLength={2}
              onChange={(event) => {
                setNickname(event.target.value);
                setError(null);
              }}
              placeholder="2~12자"
              type="text"
              value={nickname}
            />
            <p className="mt-2 text-sm text-slate-400" id="nickname-help">
              실명 대신 수업에서 사용할 별명을 권장합니다.
            </p>
            {error ? (
              <p className="mt-2 text-base font-semibold text-rose-200" id="nickname-error" role="alert">
                {error}
              </p>
            ) : null}
            <button
              className="mt-6 w-full rounded-xl bg-[#F5C968] px-5 py-3 text-base font-bold text-[#0D1730] hover:bg-[#ffdc82] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F5C968]"
              type="submit"
            >
              {progress ? "기록을 새로 시작하기" : "학습 시작하기"}
            </button>
            {progress ? (
              <button
                className="mt-3 w-full rounded-xl px-5 py-3 text-base font-semibold text-slate-200 underline decoration-slate-500 underline-offset-4"
                onClick={() => setShowNewForm(false)}
                type="button"
              >
                기존 기록으로 돌아가기
              </button>
            ) : null}
          </form>
        )}

        <p className="mt-6 border-t border-white/10 pt-5 text-sm leading-6 text-slate-400">
          공용 기기에서는 학습 후 대시보드의 ‘기록 초기화’를 눌러 주세요.
        </p>
      </section>
    </main>
  );
}
