import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ProgressProvider } from "@/context/progress-context";
import "./globals.css";

export const metadata: Metadata = {
  title: "UnityMission",
  description: "통일·평화교육 미션을 학습하는 웹앱",
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
