# 테스트·회귀·검증 게이트

## 권장 스크립트
`package.json` scripts에 `test: vitest run` 추가. 변경 파일이 게임 엔진/스토리지면 단위 테스트 즉시 수행. 작업 종료 전 `npm run lint && npx tsc --noEmit && npm run test && npm run build` 실행. `npm audit --omit=dev`는 별도 검토 기록용(실패 시 위험 평가; 자동 무시 금지).

## 자동 단위 테스트 최소 12개
1. 시작 XP=0 / Lv1
2. 첫 완료 XP100 / Lv2
3. 동일 미션 재완료 XP 추가 없음
4. 5개 완료 XP500 / Lv6
5. 미션1 기본 해제
6. 미션2는 미션1 후 해제
7. 직전 미션 미완료 시 직접 링크 잠금
8. 정상 JSON 미션5·문제15·선택지4·정답 범위
9. 잘못된 미션 ID 거부
10. 손상된 로컬 데이터 초기화 및 경고
11. 진행 중 답변 상태 저장/복원
12. 재풀이 시 최고 점수만 상승, 보상 불변
13. 완료 전 certificate 접근 차단
14. 완료 후 certificate 접근 허용

## 수동 E2E 스모크 (브라우저)
- 신규 닉네임 → 대시보드 → 첫 퀴즈 3문항 → 해설 → XP100
- 미션1 재진행 → XP가 100 유지되는지 확인
- 탭 새로고침 → 진행 보존
- 잠긴 미션 URL 직접 입력 → 접근 차단
- 5개 완료 → 500XP, 배지5개, 인쇄 미리보기
- 360px 및 데스크톱 레이아웃, 키보드 탐색
- 배포 URL에서 위 기본 흐름 다시 확인

## 자동화 가능한 것과 불가능한 것
단위 테스트는 Vitest로 자동. 실제 브라우저 E2E 자동화는 Playwright 환경이 준비된 경우에만 추가(8시간 한도 초과 시 수동 스모크). 콘텐츠 정확성·수료증 출력 품질·시각적 접근성은 사람의 검토가 필요.

## 실패 처리
실패 로그와 실행 환경 보존 → 원인 분류 → 최소 수정 → 동일 테스트 다시 실행. 같은 실패의 수정 2회 초과 시 BLOCKED. 테스트 삭제·스킵·단언 약화로 통과시키지 않는다. 미실행 검증은 NOT_RUN.

## 최종 실행 보고 양식
- npm run lint: PASS/FAIL/NOT_RUN
- npx tsc --noEmit: PASS/FAIL/NOT_RUN
- npm run test: PASS/FAIL/NOT_RUN (통과 테스트 수)
- npm run build: PASS/FAIL/NOT_RUN
- 수동 스모크: PASS/FAIL/NOT_RUN (검증 브라우저)
- 배포 URL: 실제 URL 또는 NOT_DEPLOYED
