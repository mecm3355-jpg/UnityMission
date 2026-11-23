import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ProgressProvider } from "@/context/progress-context";
import "./globals.css";

export const metadata: Metadata = {
  title: "UnityMission — 평화의 다섯 조각",
  description: "평화마을을 탐험하며 통일·평화교육 퀘스트를 해결하는 2D 픽셀 RPG",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        <a className="skip-link" href="#main-content">
          본문으로 건너뛰기
        </a>
        <div id="main-content" tabIndex={-1}>
          <ProgressProvider>{children}</ProgressProvider>
        </div>
      </body>
    </html>
  );
}
