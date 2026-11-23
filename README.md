# UnityMission

UnityMission은 5개의 통일·평화교육 미션과 15개 문항을 학습하는 반응형 웹앱입니다. 회원가입이나 서버 데이터베이스 없이 브라우저에 진행 상황을 저장하며, 미션 완료에 따라 최대 500XP, 6단계 레벨, 배지 5개와 비공식 학습 참여 확인서를 제공합니다.

## 주요 기능

- 닉네임 2~12자로 신규 학습 또는 저장 기록 이어하기
- 5개 미션 × 3문항, 각 문항 4지선다·정오답·해설·공식 출처
- 이전 미션 완료에 따른 순차 잠금 해제
- 최초 완료 100XP, 복습 0XP, 최고 정답 수와 시도 횟수 갱신
- 답안·해설·현재 문항을 `unitymission:v1`에 자동 저장·복원
- 완료 기록에서 파생하는 배지 5개
- 5개 미션 완료 후 비공식 학습 참여 확인서와 인쇄/PDF 저장
- 키보드 탐색, 상태 텍스트, 포커스 표시, reduced-motion, 모바일 반응형 UI

수료증은 **비공식 학습 참여 확인용**이며 학교나 기관의 공식 이수증 또는 평가 결과가 아닙니다. 문항의 정답 데이터는 공개되어 있으므로 공인 평가 용도로 사용하지 않습니다.

## 기술 스택

- Next.js App Router 16
- React 19, TypeScript strict
- Tailwind CSS 4
- Vitest, Testing Library, JSDOM
- React Context + 검증된 localStorage 저장소
- Vercel 배포

## 로컬 실행

Node.js 20 이상을 권장합니다.

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000`을 엽니다. 별도 환경변수나 외부 API 키는 필요하지 않습니다.

## 검증 명령

```bash
npm run lint
npx tsc --noEmit
npm run test
npm run build
npm audit --omit=dev
```

현재 자동 회귀 테스트는 닉네임 검증, 콘텐츠 스키마, XP·레벨·잠금, 중복 보상 방지, 손상 저장 복구, 새로고침 상태 복원, 키보드 퀴즈 조작, 배지와 수료증 차단·해제를 포함합니다.

## 주요 경로

- `/` — 닉네임 신규 시작·이어하기
- `/dashboard` — XP·레벨·진행률·미션 목록
- `/mission/[id]` — 미션 안내
- `/mission/[id]/play` — 3문항 학습
- `/mission/[id]/result` — 점수·보상 결과
- `/badges` — 배지 5개
- `/certificate` — 완료 전 차단, 완료 후 비공식 수료증

## 데이터와 보안

- 학습 데이터는 서버로 전송하지 않고 현재 브라우저의 `unitymission:v1` 키에만 저장합니다.
- 저장 데이터는 스키마·ID·범위·순서를 검증하며 손상 시 안전하게 초기화하고 안내합니다.
- 저장소를 사용할 수 없으면 현재 세션 메모리에서 계속 동작하고 경고합니다.
- 닉네임은 React 텍스트로만 렌더링하며 HTML 주입 API를 사용하지 않습니다.
- 공용 기기에서는 대시보드의 `기록 초기화`를 사용해야 합니다.

## Vercel 배포

Vercel 프로젝트에서 Framework Preset을 Next.js로 두고 저장소 루트를 배포합니다. 기본 명령은 다음과 같습니다.

```bash
vercel link
vercel project inspect --non-interactive
vercel --prod
```

Git 연동을 사용할 경우 production 브랜치를 `main`으로 설정하고, 배포 전 위의 검증 명령을 통과시킵니다. 이 앱은 배포 환경변수가 필요하지 않습니다.

## 아직 사람이 확인해야 할 항목

- 실제 360px 기기와 데스크톱 브라우저에서의 시각·가로 스크롤 점검
- 실제 화면 리더 탐색과 브라우저 콘솔 확인
- 수료증 인쇄 미리보기/PDF 출력 품질
- 교육 콘텐츠의 독립적인 사람 검토

구현·테스트·배포 기록과 잔여 위험은 [PROGRESS.md](./PROGRESS.md)에 기록합니다.
