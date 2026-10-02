# 계획: 코드 리뷰 반영

상태: 승인

스펙: [spec.md](spec.md). 작업 단위마다 커밋 하나를 만든다.

| 단위 | 담당 | 선행 | 병렬 |
|---|---|---|---|
| 1 정리 | 메인 | - | 2와 함께 |
| 2 lib | 메인 | - | 1과 함께 |
| 3 크롤러 | data-implementer | - | 1·2·4·5·6과 함께 |
| 4 체크 흐름 | frontend-implementer | 1 | 5·6과 함께 |
| 5 리포트·랜딩·방침 | frontend-implementer | 1, 2 | 4·6과 함께 |
| 6 병원 목록 | frontend-implementer | 1 | 4·5와 함께 |
| 7 버튼 크기 | 메인 | 4, 5, 6 | - |
| 8 e2e | frontend-implementer | 7 | - |
| 9 문서 | 메인 | 3, 7 | 8과 함께 |

## 1. 쓰지 않는 코드 정리 (A1, ⚪)

| 파일 | 바꾸는 것 |
|---|---|
| `frontend/src/app/providers.tsx` | 삭제 |
| `frontend/src/app/layout.tsx` | `<Providers>` 감싸기 제거 |
| `frontend/package.json`, lock | `@tanstack/react-query` 제거 |
| `frontend/src/components/ui/{dialog,dropdown-menu,input,label,select,tabs,textarea,tooltip}.tsx` | 삭제 |
| `frontend/src/lib/utils.ts`, `frontend/src/data/.gitkeep`, `crawler/src/sources/.gitkeep` | 삭제 |

커밋: `chore: remove unused React Query and components`

## 2. lib 규칙 (C4, A2, T1, P9)

| 파일 | 바꾸는 것 |
|---|---|
| `frontend/src/lib/sleep-check.ts` | `MODERATE_MIN` export. `judge`가 이 값을 쓴다. 디코딩 허용 길이는 `MAX_CODE.toString(36).length`로 계산한다. 인코딩은 `id`로 비교한다 |
| `frontend/src/lib/sleep-check.test.ts` | 해시 고정값 테스트를 추가한다(`v1-0`, `v1-1`, `v1-e7`, 단계 판정) |
| `frontend/src/lib/hospitals.test.ts` | 계약 테스트에 `kind` 허용 값 검사를 추가한다 |

커밋: `fix: define judgment thresholds once and pin the share hash format`

## 3. 크롤러 신뢰성 (R1, R2, P1, P3–P9, A5)

담당 범위는 `crawler/`, `.github/workflows/crawl.yml`이다.

- **R1** `MIN_RESMED_ITEMS`를 300으로 올린다. `crawl.yml`에서 커밋 전에 프론트 의존성을 설치하고 `pnpm --dir frontend test`를 돌린다.
- **R2** `sleepnet.crawl`은 실패하면 throw한다. `index.ts`가 이를 받아 이전 JSON에서 `listed`·`homepage`를 id 기준으로 이어 붙인다. 실패 사실은 남겨서 프로세스 종료 코드를 1로 만든다. 데이터는 저장하되 워크플로우는 실패로 끝내 이슈를 만든다(P5).
- **P1** 이전 JSON보다 레즈메드 출처 병원이나 listed 병원 수가 20% 넘게 줄면 throw한다. 비교는 순수 함수로 만들고 테스트한다.
- **P2** 하지 않는다. 매주 커밋은 화면의 수집 시각을 갱신하려는 의도한 동작이다(`docs/architecture.md`).
- **P3** 학회 목록은 빈 페이지가 나올 때까지 순회한다. 안전 상한은 20쪽이다. 1쪽이 비면 실패로 본다.
- **P4** `fetchText`에 `AbortSignal.timeout(30_000)`을 준다. 5xx와 네트워크 오류는 최대 2회 재시도한다(1초, 2초 간격).
- **P5** `crawl.yml`에 `if: failure()` 단계를 둔다. `gh issue create`로 이슈를 만들고 `issues: write` 권한을 준다.
- **P6** 저장 전에 `id` 기준으로 정렬한다.
- **P7** push 전에 `git pull --rebase`를 한다.
- **P8** resmed 파서에서 region 계산(`REGION_BY_DISTRICT`)을 뺀다. 지역번호는 merge에서 주소로 구한 region을 기준으로 붙인다.
- **P9** `assertValid`에 `kind` 허용 값 검사를 추가한다.
- **A5** `ADDABLE_KINDS`를 지우고 `kindOf()` 결과로 판단한다.

`hospitals.json`은 손으로 고치지 않는다. 형태가 바뀌지 않으므로 다음 크롤에서 반영된다.

확인: `make crawler-check`

커밋: `fix(crawler): guard against partial failures and keep data diffs stable`

## 4. 체크 흐름 (C1, C3, U3, U4 일부)

대상 파일은 `frontend/src/components/sleep/check-flow.tsx`다.

- **C1** 마지막 문항에서는 잠금을 풀지 않는다. 타이머 id를 ref로 저장한다.
- **C3** 다음 질문으로 넘어갈 때 `history.pushState({ step })`를 하고, `popstate`가 오면 해당 단계로 되돌린다. "이전 질문" 버튼은 `history.back()`을 부른다. 잠금 중이면 예약된 타이머를 취소한다.
- **U3** 질문 `h1`에 `tabIndex={-1}`을 주고, 단계가 바뀌면 `focus()`한다.
- **U4** 제목의 `leading-snug`를 제거한다.

커밋: `fix: make the check flow safe against double taps and the back button`

## 5. 리포트·랜딩·개인정보처리방침 (C2, A2, U2, U4 일부)

| 파일 | 바꾸는 것 |
|---|---|
| `report-view.tsx`, `report.tsx` | 날짜 prop과 표시 제거. 판단 기준 문구는 `QUESTIONS.filter(q => q.strong)`와 `MODERATE_MIN`으로 만든다. 제목의 `leading-snug` 제거 |
| `landing.tsx` | 제목의 `leading-tight` 제거 |
| `app/privacy/page.tsx` | Meta 이벤트 설명을 "병원 정보 보기를 눌렀는지"로 고친다. 위치 안내 한 줄을 추가한다 |

커밋: `fix: drop the viewing date from reports and match privacy copy to behavior`

## 6. 병원 목록 렌더링 비용 (A3)

`clinic-finder.tsx`의 목록 `li`에 `content-visibility: auto`와 `contain-intrinsic-size`를 준다. 임의 값 대신 Tailwind 유틸이나 `globals.css` 클래스 하나를 쓴다.

커밋: `perf: skip offscreen clinic cards while rendering`

## 7. 버튼 크기 통일 (A4)

- `components/ui/button.tsx`에 크기 두 개를 추가한다.
  - `touch`: `h-auto min-h-12 py-2 text-lg whitespace-normal`
  - `cta`: `h-auto min-h-14 py-2 text-lg whitespace-normal`
- 버튼 클래스를 손으로 반복하던 14곳을 이 크기로 바꾼다. 가로 패딩은 화면 성격에 맞춰 남긴다.

커밋: `refactor: share touch and CTA button sizes`

## 8. e2e 확장 (T2)

`frontend/e2e/a11y.spec.ts`를 넓힌다.

- **화면 추가:** `/c/*`, `/r#bad`, error 화면
- **흐름 테스트:** 9문항을 모두 답하고 리포트 단계가 보이는지 확인한다. 중간에 뒤로 가기를 눌러 이전 문항으로 돌아오는지도 확인한다.
- **접근성 검사:** axe 기본 규칙 전체를 한 번 돌린다.

확인: `make fe-a11y`

커밋: `test: cover the check-to-report flow and more screens`

## 9. 문서 (A6, U1)

`docs/architecture.md`에 다음을 반영한다.

- `kind` 필드를 추가한다.
- 작업 04~06 링크를 추가한다.
- GA 향상된 측정 설정과 확인 방법을 적는다.
- 크롤 가드를 적는다.

`docs/design-pass.md`의 S3 머리말에서 날짜를 지운다.

커밋: `docs: sync architecture with the review fixes`
