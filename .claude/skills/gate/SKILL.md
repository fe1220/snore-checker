---
name: gate
description: 구현 완료 후 검증 게이트를 실행한다. "게이트 돌려줘", "검증해줘", "/gate"
---

1. `make gate`를 실행한다 (프론트 tsc/lint/prettier/vitest/build, 크롤러 tsc/test).
2. 실패하면 원인만 요약하고 멈춘다. 자동으로 고치지 않는다.
3. 통과하면 `preview_start`로 `frontend` 서버를 띄운 뒤 두 서브에이전트를 병렬로 실행한다. 구현한 세션과 다른 컨텍스트에서 판정하기 위해서다.
   - `verifier`: `docs/05-verification.md` 기준 기능 판정
   - `design-reviewer`: 디자이너 관점 UI/UX 판정. `frontend/`에 변경이 없으면 생략한다.
4. verifier가 "QA 필요"로 넘긴 항목은 gstack `/qa` 스킬로 브라우저 검증한다. gstack이 없으면 `make setup-agent` 안내 후 내장 브라우저로 진행한다.
5. 결과를 `docs/05-verification.md` 하단 "결과" 섹션에 기록하고 PASS/FAIL 요약을 보고한다. design-reviewer의 P0·P1은 FAIL로 취급한다.
