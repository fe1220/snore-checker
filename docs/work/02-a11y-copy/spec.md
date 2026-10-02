# 테크스펙: 40~60대 접근성과 쉬운 문구

상태: 승인

[디자인패스 접근성 섹션](../../design-pass.md#접근성-4060대-기준)을 S1~S4 전체에 적용한다. 화면 구조와 데이터는 바꾸지 않는다.

| 파일 | 바꾸는 것 |
|---|---|
| `src/app/globals.css` | `muted-foreground`, `warning`, `destructive`를 카드 위에서 7:1이 되게, `border`를 3:1이 되게 조정. `prefers-reduced-motion`에서 전환 효과를 끄는 전역 규칙 |
| `src/components/sleep/*` | 글자 16px 미만 제거, 본문 18px. 뒤로 가기 48px. 선택지와 주요 버튼을 최소 높이로. 막대 라벨 열의 고정 폭 제거 |
| `src/components/clinics/*`, `src/app/clinics/page.tsx` | 글자 16px 미만 제거. 버튼 48px. 지역 이름 `truncate` 제거 |
| `src/app/privacy/page.tsx` | 글자 16px 미만 제거 |
| `src/components/ui/*` | 고치지 않는다. 기본값이 작은 곳은 쓰는 쪽에서 `className`으로 덮어쓴다 (`DESIGN.md` 6절) |

**측정 스크립트**

- `frontend/e2e/a11y.spec.ts` (Playwright). 새 개발 의존성 `@playwright/test`가 필요하다. 글자 크기와 터치 영역은 브라우저가 계산한 값을 봐야 해서 정적 검사로는 판정할 수 없다.
- 대상 경로: `/`, `/check`(1번·2번 문항), `/r`(세 판정 단계의 해시), 공유받은 리포트, `/clinics`(목록, 지역 Sheet), `/privacy`.
- 판정:

| 검사 | 기준 |
|---|---|
| 보이는 글자의 계산된 크기 | 16px 이상 |
| 버튼·링크·선택지의 크기 | 높이 48px 이상. 본문 안 글자 링크는 제외 |
| 인접 터치 영역 사이 | 8px 이상 |
| 글자와 배경의 대비 | 7:1 이상 (`@axe-core/playwright`의 `color-contrast-enhanced`) |
| 폭 320px | `scrollWidth`가 화면 폭 이하 |
| 글자 200% (`html` 글자 크기 200%) | 가로 스크롤 없음, 글자가 든 요소에서 넘침 없음 |

- 스크린샷: 폭 320·375 × 글자 100·130·200%를 `docs/work/02-a11y-copy/screenshots/`에 저장한다.
- `make gate`에 `fe-a11y`를 추가한다. CI(`gate.yml`)에는 Playwright 브라우저 설치 단계가 필요하다.
