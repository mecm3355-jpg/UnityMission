# Codex 작업 지시 프롬프트

## 최초 실행 프롬프트 (저장소 루트에서 사용)
```
이 저장소의 AGENTS.md와 PRD.md, TASKS.md, ACCEPTANCE.md, TEST_PLAN.md, SECURITY.md, PROGRESS.md를 먼저 읽어. AGENTS.md 규칙을 준수하고 T01부터 의존성 순서로 작업해. 한 번에 하나의 태스크만 진행하고 각 태스크의 검증 게이트를 통과했을 때만 DONE 처리해. 실패하면 원인 분석 후 최대 2회 최소 수정·재검증하고, 해결되지 않으면 BLOCKED로 기록해. P0 밖 기능은 추가하지 마. 실제 실행하지 않은 테스트는 NOT_RUN으로 보고해. GitHub 푸시·Vercel 배포 등 원격 변경에는 사전 확인이 필요해. 각 작업 이후 PROGRESS.md를 갱신하고 변경 파일, 실행 명령, 종료코드, 남은 위험을 보고해. 우선 T01을 구현해.
```

## 다음 태스크 실행 (반복 사용)
```
AGENTS.md, TASKS.md, PROGRESS.md를 확인해 가장 앞선 TODO 중 선행 완료된 작업 1개를 구현해. 해당 작업 관련 수락 기준을 만족하고 가능한 검증을 실제 실행해. 오류 발생 시 최대 2회 복구 루프를 적용하고 결과를 PROGRESS.md에 기록해. 테스트를 삭제하거나 실패를 성공으로 보고하지 마. 작업이 끝나면 다음 작업 ID와 남은 위험을 알려줘.
```

## 7시간차 QA
```
T07 작업을 수행해. ACCEPTANCE.md A01~A17과 SECURITY.md의 검증을 실행 가능한 범위에서 확인하고, lint/typecheck/test/build 결과를 정확히 기록해. UI는 모바일 360px에서 확인하고 접근성·콘텐츠 출처도 확인해. 해결되지 않은 P0 문제는 BLOCKED로 기록하고 출시 준비 완료로 표시하지 마.
```

## 8시간차 배포
```
T08을 수행해. 먼저 원격 GitHub 푸시 및 Vercel 배포에 대한 승인/권한을 확인해. 승인되면 Vercel에 배포하고 실제 URL에서 신규 사용자 학습 흐름을 확인해. 배포가 불가능하면 원인과 수동 절차를 기록하고 NOT_DEPLOYED로 표시해. README를 정리하고 PRD의 DoD 결과를 보고해.
```

## 완료 보고 형식
```
TASK: Txx
RESULT: DONE / BLOCKED
FILES: ...
CHECKS: 명령별 PASS / FAIL / NOT_RUN
ACCEPTANCE: Axx...
ATTEMPTS: ...
RISKS: ...
NEXT: Tyy or STOP
```
