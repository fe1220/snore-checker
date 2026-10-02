# DESIGN.md

모든 UI 작업(사람·에이전트 공통)은 이 문서를 따른다. 여기 없는 패턴이 필요하면 먼저 이 문서에 추가하고 구현한다.

## 1. 원칙

1. **사용자가 판단할 일을 줄인다.** 시스템이 추론할 수 있는 값은 기본값으로 채우고, 선택지는 최소화한다.
2. **한 화면 = 한 주요 행동.** Primary CTA는 화면당 1개.
3. **모바일 퍼스트.** 375px 기준으로 설계하고 데스크탑은 확장한다.
4. **모든 데이터 영역은 4가지 상태를 가진다:** 로딩 / 빈 상태 / 에러 / 정상.
5. **문구는 쉬운 말로.** 개발 용어, 영어 약어, 수동태 금지. 행동은 동사로 끝낸다 ("예약하기", "다시 시도").

## 2. 스택

- Next.js (App Router) + Tailwind CSS v4 + **shadcn/ui** (`src/components/ui`)
- 아이콘: `lucide-react` 만 사용
- 데이터: 크롤링 JSON을 서버 컴포넌트에서 import한다. 원격 조회가 생기면 클라이언트 쪽은 TanStack Query
- 토스트: `sonner` (`import { toast } from "sonner"`)
- 폰트: Pretendard Variable

## 3. 토큰 (`src/app/globals.css`)

색상은 **시맨틱 토큰만** 사용한다. `bg-blue-500`, `#hex` 같은 원시값 금지.

| 용도 | 클래스 |
|---|---|
| 페이지 배경 / 본문 | `bg-background` / `text-foreground` |
| 주요 액션, 링크, 선택 상태 | `bg-primary` `text-primary-foreground` / `text-primary` |
| 보조 정보 텍스트 | `text-muted-foreground` |
| 보조 영역 배경 | `bg-muted` |
| 구분선 / 입력 테두리 | `border-border` / `border-input` |
| 성공 · 주의 · 위험 | `text-success` · `text-warning` · `text-destructive` |

- Primary 색은 임시값(블루). 브랜드 확정 시 `--primary`, `--ring`만 바꾼다.
- Radius: `--radius` 0.75rem. 카드 `rounded-xl`, 버튼·입력 `rounded-lg`(컴포넌트 기본값 유지).

## 4. 타이포그래피

| 역할 | 클래스 |
|---|---|
| 페이지 제목 | `text-2xl font-bold` |
| 섹션 제목 | `text-lg font-semibold` |
| 카드 제목 / 강조 | `text-base font-semibold` |
| 본문 | `text-base` (모바일 16px 미만 금지) |
| 보조 정보 | `text-sm text-muted-foreground` |
| 캡션, 메타 | `text-xs text-muted-foreground` |

숫자(가격, 평점, 거리)는 `tabular-nums`. 한 화면에 굵기는 최대 3종.

## 5. 레이아웃 · 간격

- 4px 그리드. 허용 간격: `1 2 3 4 6 8 12 16`
- 페이지 컨테이너: `mx-auto w-full max-w-screen-md px-4` (리스트/상세형). 대시보드형만 `max-w-screen-xl`.
- 섹션 간 `gap-8`, 카드 내부 `gap-3`~`gap-4`, 리스트 아이템 간 `gap-2`~`gap-3`
- 모바일 Primary CTA는 하단 고정 바: `sticky bottom-0 border-t bg-background p-4` + 전체 폭 버튼
- 터치 타겟 최소 44px (`h-11` 이상)

## 6. 컴포넌트 사용 규칙

| 상황 | 컴포넌트 |
|---|---|
| 주요 행동 | `Button` (default) — 화면당 1개 |
| 보조 행동 | `Button variant="outline"` 또는 `"ghost"` |
| 파괴적 행동 | `Button variant="destructive"` + 확인 `Dialog` |
| 정보 묶음 | `Card` |
| 상태 라벨 | `Badge` |
| 모바일 선택지 / 필터 | `Sheet side="bottom"` |
| 확인 / 짧은 폼 | `Dialog` |
| 탭 전환 | `Tabs` |
| 결과 피드백 | `toast` (성공은 짧게, 에러는 다음 행동 포함) |

- shadcn 컴포넌트는 직접 수정하지 말고 `variant`/`className`으로 확장한다. 반복되는 조합은 `src/components/<domain>/`에 도메인 컴포넌트로 만든다.
- 새 shadcn 컴포넌트: `pnpm dlx shadcn@latest add <name>`

## 7. 상태 패턴

| 상태 | 표현 |
|---|---|
| 로딩 | 실제 레이아웃 모양의 `Skeleton` (스피너 단독 금지) |
| 빈 상태 | 아이콘 + 한 줄 설명 + 다음 행동 버튼 |
| 에러 | 무슨 일인지 + "다시 시도" 버튼. 원시 에러 메시지 노출 금지 |
| 제출 중 | 버튼 `disabled` + 문구 변경 ("저장 중…"), 중복 제출 방지 |
| 폼 검증 | 필드 아래 `text-sm text-destructive`, blur 시점 검증 |

## 8. 인터랙션

- 클릭 가능한 카드 안에 버튼을 중첩하지 않는다. 필요하면 카드 전체를 링크로 하고 보조 액션은 카드 밖에 둔다.
- hover는 데스크탑 보조 신호일 뿐, 정보 전달에 의존하지 않는다.
- 낙관적 업데이트는 되돌리기 쉬운 행동(좋아요, 저장)에만.

## 9. 접근성

- 모든 입력에 `Label`, 아이콘 단독 버튼에 `aria-label`
- 텍스트 대비 4.5:1 이상, 포커스 링(`ring`) 제거 금지

## 10. 체크리스트 (PR / 검증 게이트)

- [ ] 원시 색상값·임의 간격 없음
- [ ] Primary CTA 1개
- [ ] 로딩·빈·에러 상태 구현
- [ ] 375px에서 가로 스크롤 없음
- [ ] 문구가 쉬운 말이고 동사로 끝남
