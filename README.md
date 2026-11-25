# UnityMission

UnityMission — 평화의 다섯 조각은 기존 통일교육 대시보드와 진행 기록을 공유하는 브라우저 2D 픽셀 RPG입니다. 하나의 평화마을을 탐험하고 NPC 5명의 교육 퀘스트를 통과해 다섯 조각을 모읍니다. 회원가입이나 서버 데이터베이스 없이 브라우저에 저장하며 최대 500XP, 6단계 레벨, 배지 5개와 비공식 학습 참여 확인서를 제공합니다.

## 주요 기능

- WASD·방향키·모바일 가상 방향키로 탐험하는 1920×1280 평화마을
- NPC 5명 근접 E 상호작용, 상태별 대화와 순차 퀘스트 해금
- 5개 미션 × 3문항, 각 문항 4지선다·정오답·해설·공식 출처
- 이전 미션 완료에 따른 순차 잠금 해제
- 3문항 중 2문항 이상 정답일 때 통과, 첫 오답에는 힌트와 재선택 기회 제공
- 최초 통과 100XP, 복습 0XP, 최고 정답 수와 시도 횟수 갱신
- 답안·해설·현재 문항을 `unitymission:v1`에 자동 저장·복원
- 완료 기록에서 파생하는 배지 5개
- 5개 미션 완료 후 비공식 학습 참여 확인서와 인쇄/PDF 저장
- 평화 조각 인벤토리와 다섯 조각 결합 엔딩
- 키보드 탐색, 상태 텍스트, 포커스 표시, reduced-motion, 모바일 반응형 UI

수료증은 **비공식 학습 참여 확인용**이며 학교나 기관의 공식 이수증 또는 평가 결과가 아닙니다. 문항의 정답 데이터는 공개되어 있으므로 공인 평가 용도로 사용하지 않습니다.

## 기술 스택

- Next.js App Router 16
- React 19, TypeScript strict
- Tailwind CSS 4
- Phaser 3.90
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
npm run test:e2e:rpg
```

현재 자동 회귀 테스트는 기존 대시보드 전체와 닉네임 검증, 콘텐츠 스키마, 통과 기준·힌트, XP·레벨·잠금, 중복 보상 방지, 손상 저장 복구, 월드 상호작용, 모바일 입력, 배지와 수료증을 포함합니다. `npm run test:e2e:rpg`는 production build 후 임시 서버와 격리 Chrome을 자동으로 열어 이동·충돌·NPC·힌트·퀘스트·엔딩·360px 조작을 검증하고 종료합니다. Chrome 자동 탐색이 실패하면 `CHROME_PATH`에 실행 파일 경로를 지정합니다.

통과 기준 도입 전에 저장된 유효 완료 기록은 사용자 진행을 소급 삭제하지 않고 인정합니다. 새 도전은 3문항 중 2문항 이상을 맞혀야만 완료와 100XP를 받습니다.

## 주요 경로

- `/` — RPG 신규 시작·이어하기
- `/game` — 평화마을 2D RPG 플레이
- `/dashboard` — XP·레벨·진행률·미션 목록
- `/mission/[id]` — 미션 안내
- `/mission/[id]/play` — 3문항 학습
- `/mission/[id]/result` — 점수·보상 결과
- `/badges` — 배지 5개
- `/certificate` — 완료 전 차단, 완료 후 비공식 수료증

## 데이터와 보안

- 학습/성장 데이터는 서버로 전송하지 않고 현재 브라우저의 `unitymission:v1` 키 하나에 저장합니다. 엔딩은 별도 기록하지 않고 미션 5개 통과 여부로 실행합니다.
- 저장 데이터는 스키마·ID·범위·순서를 검증하며 손상 시 안전하게 초기화하고 안내합니다.
- 저장소를 사용할 수 없으면 현재 세션 메모리에서 계속 동작하고 경고합니다.
- 닉네임은 React 텍스트로만 렌더링하며 HTML 주입 API를 사용하지 않습니다.
- 모든 경로에 CSP, MIME 스니핑 방지, Referrer Policy, 프레임 차단, 카메라·마이크·위치 권한 차단 헤더를 적용합니다.
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

- 실제 iOS/Android 물리 기기에서의 터치 감각 점검
- 실제 화면 리더 탐색과 브라우저 콘솔 확인
- 수료증 인쇄 미리보기/PDF 출력 품질
- 교육 콘텐츠의 독립적인 사람 검토

구현·테스트·배포 기록과 잔여 위험은 [PROGRESS.md](./PROGRESS.md)에 기록합니다.
