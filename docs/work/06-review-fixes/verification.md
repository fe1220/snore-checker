# 검증: 코드 리뷰 반영

기준 문서: [스펙](spec.md), [구현 계획](plan.md), [코드 리뷰](../../code-review.md)

## 자동

- [x] V1 `make gate`가 통과한다.
- [x] V2 `@tanstack/react-query`, `providers.tsx`, 쓰지 않는 ui 컴포넌트 8개, `lib/utils.ts`가 없다.
- [x] V3 `sleep-check.test.ts`에 해시 고정값 테스트가 있다. `judge`와 리포트 문구가 같은 `MODERATE_MIN`을 쓴다. 리포트 코드에 "3개" 같은 숫자가 하드코딩돼 있지 않다.
- [x] V4 크롤러 테스트가 다음을 확인한다.
  - 이전 대비 20% 넘게 줄면 throw한다.
  - 학회 목록 수집이 실패하면 이전 `listed` 값을 유지한다.
  - 빈 페이지가 나올 때까지 순회한다.
  - 5xx 응답은 재시도한다.
  - 저장 순서가 id순이다.
  - `kind`가 허용 값을 벗어나면 throw한다.
- [x] V5 `crawl.yml`에 다음이 있다.
  - 커밋 전 프론트 테스트
  - `git pull --rebase`
  - `if: failure()` 이슈 생성 단계와 `issues: write` 권한
- [x] V6 `ADDABLE_KINDS`와 resmed의 `REGION_BY_DISTRICT`가 없다. 지역번호는 주소로 구한 region을 기준으로 붙는다.
- [x] V7 손으로 반복하던 `h-auto min-h-1[24] … text-lg whitespace-normal` 버튼 클래스가 `size="touch"`나 `size="cta"`로 바뀌었다.
- [x] V8 늘어난 e2e가 통과한다: 체크 → 리포트 흐름, 뒤로 가기, `/c/*`, `/r#bad`, axe 기본 규칙.

## 브라우저 (375px)

- [x] V9 마지막 문항을 빠르게 두 번 눌러도 `check_complete`가 한 번만 나가고 리포트로 한 번만 이동한다.
- [x] V10 질문 3에서 휴대폰 뒤로 가기(`history.back()`)를 누르면 질문 2로 간다. 답을 누른 직후 0.2초 안에 "이전 질문"을 눌러도 앞으로 넘어가지 않는다.
- [x] V11 질문이 바뀌면 포커스가 질문 제목으로 간다.
- [x] V12 리포트 머리말에 날짜가 없다. 판단 기준 문구가 이전과 같은 내용으로 보인다.
- [x] V13 개인정보처리방침에 "병원 정보 보기"와 위치 안내가 있다.
- [x] V14 `/clinics` 전국 보기의 스크롤, 지역 소제목, 카드 표시가 이전과 같다.
- [x] V15 바꾼 버튼들의 높이(48px·56px)와 글자 크기가 이전과 같다.

## 결과 (2026-10-03)

- 검증은 별도 에이전트(verifier, design-reviewer)가 했다. 첫 판정에서 실패가 나와 수정한 뒤 `make gate`를 다시 돌려 통과했다. e2e 141개, vitest 27개, crawler 86개.
- 첫 판정에서 나온 실패와 수정:
  - **V1·V8:** `/clinics`의 axe 전체 검사가 카드 744개에서 30초를 넘겨 타임아웃이 났다. 이 화면 테스트에 `test.slow()`를 줬다.
  - **V14:** `li`에 준 `content-visibility`가 카드 테두리(ring)를 잘랐다. 유틸을 `Card`에 직접 줬다.
- 디자인 리뷰 P2: `/r#bad` 제목을 다른 오류 화면과 같은 패턴(제목 + 설명 한 줄)으로 맞췄다.
- 검증자 참고 사항: 답 직후 "이전 질문"을 누르면 타이머와 popstate가 경합할 수 있다. 버튼을 누를 때 타이머를 먼저 끊도록 고쳤다.
- 제외: error 화면은 빌드 결과에서 강제로 띄울 수 없어 e2e에서 뺐다.
