# 구현 계획: 40~60대 접근성과 쉬운 문구

상태: 승인

> **에이전트용:** superpowers:subagent-driven-development로 작업 단위별로 실행한다. 단계는 체크박스(`- [ ]`)로 추적한다.

**목표:** S1~S4와 처리방침의 글자·터치 영역·대비·확대 대응을 40~60대 기준에 맞추고, 문구 감사에서 나온 수정 35건과 빠진 화면(없는 주소, 오류, 처리방침 링크)을 채운다.

**구조:** 먼저 브라우저에서 기준을 재는 Playwright 스크립트를 만든다(지금 화면에서는 실패한다). 그다음 공통 토큰과 `lib` 문구를 고치고, 화면 세 묶음을 병렬로 고쳐 스크립트를 통과시킨다. 마지막에 스크립트를 `make gate`에 넣는다.

**스택:** Next.js App Router, Tailwind v4, shadcn/ui(base-ui), vitest. 새 개발 의존성: `@playwright/test`, `@axe-core/playwright`.

**스펙:** [ux-spec 접근성](../../ux-spec.md#접근성-4060대-기준), [테크스펙](spec.md), [DESIGN.md](../../../DESIGN.md) 4·5·9절, [copy-audit](../../research/copy-audit.md)

## 공통 제약

- 읽는 글자는 16px 이상, 본문은 18px(`text-lg`). `text-sm`·`text-xs`를 쓰지 않는다.
- 터치 영역은 48px 이상, 주요 버튼은 56px. 터치 영역 사이는 8px 이상.
- 글자가 든 요소는 `h-*` 대신 `min-h-*`를 쓴다. `truncate`·`line-clamp`를 쓰지 않는다.
- 글자 대비 7:1 이상, 테두리 3:1 이상. 원시 색상값을 쓰지 않는다.
- `src/components/ui/*`는 고치지 않는다. 쓰는 쪽에서 `className`으로 덮어쓴다.
- 화면 구조, 정보 위계, 판정 규칙, 분석 이벤트는 바꾸지 않는다.
- 문구는 이 계획에 적힌 것만 바꾼다. [copy-audit](../../research/copy-audit.md)의 "검토" 11건(27, 36, 79, 88, 92, 109, 117, 118, 121, 135, 141)은 건드리지 않는다.
- 코 고는 사람은 "남편"이라고 부른다. 광고 소재가 모두 "남편"이라 들어온 사람에게 가장 분명하다. "배우자"는 답하는 사람인지 코 고는 사람인지 헷갈려 화면 문구에 쓰지 않는다.
- `report.tsx`는 이 계획을 쓰는 동안에도 사용자가 고치고 있었다. 아래 "지금 문구"가 파일에 없으면 그 줄은 건너뛰고 보고한다. 추측으로 다른 문장을 바꾸지 않는다.
- 작업 단위마다 커밋 1개. 푸시는 작업 6이 끝나고 `make gate`가 통과한 뒤 한 번만 한다.

## 작업 단위와 순서

| # | 작업 | 담당 | 소유 파일 | 의존 |
|---|---|---|---|---|
| 0 | 검증 기준 작성 | 메인 | `docs/work/02-a11y-copy/verification.md` | - |
| 1 | 측정 스크립트 | 메인 | `frontend/e2e/`, `frontend/playwright.config.ts`, `frontend/package.json`, `Makefile`, `.gitignore` | 0 |
| 2 | 공통: 토큰, `lib` 문구, 없는 주소·오류 화면, 용어표 | 메인 | `frontend/src/app/globals.css`, `frontend/src/lib/sleep-check.ts`, `frontend/src/app/not-found.tsx`, `frontend/src/app/error.tsx`, `frontend/src/app/layout.tsx`, `DESIGN.md` | 1 |
| 3 | S1 체크 시작, S2 체크 | frontend-implementer | `frontend/src/components/sleep/landing.tsx`, `check-flow.tsx` | 2 |
| 4 | S3 리포트, 공유 미리보기 | frontend-implementer | `frontend/src/components/sleep/report.tsx`, `report-view.tsx`, `share-button.tsx`, `frontend/src/app/r/page.tsx`, `frontend/src/app/opengraph-image.tsx` | 2 |
| 5 | S4 근처 수면클리닉, 처리방침 | frontend-implementer | `frontend/src/components/clinics/*`, `frontend/src/app/clinics/page.tsx`, `frontend/src/app/privacy/page.tsx` | 2 |
| 6 | 게이트 편입, 스크린샷, 검증 | 메인 | `Makefile`, `.github/workflows/gate.yml`, `docs/work/02-a11y-copy/verification.md`, `docs/work/02-a11y-copy/screenshots/` | 3, 4, 5 |

작업 3·4·5는 파일이 겹치지 않아 병렬로 돌린다.

### 작업 0: 검증 기준 작성

**파일:** 수정 `docs/work/02-a11y-copy/verification.md`

- [ ] **1단계: 체크리스트 추가.** 파일 끝에 아래를 붙인다.

체크리스트는 [verification.md](verification.md)에 있다.

- [ ] **2단계: 커밋**

```bash
git add docs/work/02-a11y-copy/verification.md
git commit -m "docs: add verification criteria for accessibility and copy"
```

### 작업 1: 측정 스크립트

**파일:**
- 생성 `frontend/playwright.config.ts`, `frontend/e2e/a11y.spec.ts`
- 수정 `frontend/package.json`, `Makefile`, `.gitignore`

**제공하는 것:** `make fe-a11y` (작업 3~6이 쓴다). 실패하면 화면 이름, 검사 이름, 위반 요소의 글자와 값을 출력한다.

- [ ] **1단계: 의존성 설치**

```bash
pnpm --dir frontend add -D @playwright/test @axe-core/playwright
pnpm --dir frontend exec playwright install chromium
```

- [ ] **2단계: 설정 파일.** `frontend/playwright.config.ts`

```ts
import { defineConfig } from "@playwright/test"

// 빌드된 결과를 띄워서 잰다. 개발 서버는 오버레이가 끼어 측정이 달라진다.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3100",
    viewport: { width: 375, height: 812 },
    locale: "ko-KR",
  },
  webServer: {
    command: "pnpm exec next start -p 3100",
    url: "http://localhost:3100",
    reuseExistingServer: false,
  },
})
```

- [ ] **3단계: 측정 스크립트.** `frontend/e2e/a11y.spec.ts`

```ts
import AxeBuilder from "@axe-core/playwright"
import { expect, test, type Page } from "@playwright/test"

// 리포트 해시: 문항 9개 전부(e7), 약한 신호 3개(3n), 신호 없음(0). lib/sleep-check.ts의 비트 순서를 따른다.
const SCREENS: { name: string; path: string; open?: string; answer?: string }[] = [
  { name: "s1-start", path: "/" },
  { name: "s2-check", path: "/check" },
  // 2번 질문부터 뒤로 가기 버튼이 생긴다.
  { name: "s2-check-back", path: "/check", answer: "아니요" },
  { name: "s3-strong", path: "/r#v1-e7" },
  { name: "s3-moderate", path: "/r#v1-3n" },
  { name: "s3-weak", path: "/r#v1-0" },
  { name: "s3-shared", path: "/r?shared=1#v1-e7" },
  { name: "s4-clinics", path: "/clinics" },
  { name: "s4-regions", path: "/clinics", open: "전국 ·" },
  { name: "privacy", path: "/privacy" },
  { name: "not-found", path: "/nope" },
]

const MIN_FONT = 16
const MIN_TARGET = 48
const MIN_GAP = 8

async function open(page: Page, screen: (typeof SCREENS)[number]) {
  await page.goto(screen.path)
  await page.waitForLoadState("networkidle")
  if (screen.answer) {
    await page.getByRole("button", { name: screen.answer, exact: true }).click()
    await page.getByRole("button", { name: /이전 질문/ }).waitFor()
  }
  if (screen.open) {
    await page.getByRole("button", { name: new RegExp(screen.open) }).click()
    await page.getByRole("dialog").waitFor()
  }
}

// 글자만 키운다(안드로이드 글꼴 배율과 같다). 여백과 고정 높이는 그대로라 넘침이 드러난다.
async function scaleText(page: Page, scale: number) {
  await page.evaluate((s) => {
    const all = [...document.querySelectorAll<HTMLElement>("body *")]
    const sizes = all.map((el) => parseFloat(getComputedStyle(el).fontSize))
    all.forEach((el, i) => (el.style.fontSize = `${sizes[i] * s}px`))
  }, scale)
}

function smallText(page: Page, min: number) {
  return page.evaluate((minSize) => {
    const found: string[] = []
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node.textContent?.trim()
      const el = node.parentElement
      if (!text || !el) continue
      if (el.closest("script, style, noscript, [aria-hidden='true']")) continue
      const rect = el.getBoundingClientRect()
      const style = getComputedStyle(el)
      if (rect.width <= 1 || rect.height <= 1 || style.visibility === "hidden")
        continue
      const size = parseFloat(style.fontSize)
      if (size < minSize) found.push(`${size}px "${text.slice(0, 30)}"`)
    }
    return found
  }, min)
}

// 문장 안의 글자 링크(display: inline)는 터치 영역 검사에서 뺀다.
function targets(page: Page) {
  return page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>("a[href], button, [role='button']")]
      .filter((el) => {
        const rect = el.getBoundingClientRect()
        const style = getComputedStyle(el)
        return (
          rect.width > 0 &&
          rect.height > 0 &&
          style.visibility !== "hidden" &&
          style.display !== "inline"
        )
      })
      .map((el) => {
        const rect = el.getBoundingClientRect()
        const range = document.createRange()
        range.selectNodeContents(el)
        const inner = range.getBoundingClientRect()
        return {
          label: (el.getAttribute("aria-label") ?? el.innerText).trim().slice(0, 30),
          x: rect.left,
          y: rect.top,
          w: rect.width,
          h: rect.height,
          spill:
            inner.width > 0 &&
            (inner.left < rect.left - 1 ||
              inner.right > rect.right + 1 ||
              inner.top < rect.top - 1 ||
              inner.bottom > rect.bottom + 1),
        }
      }),
  )
}

type Target = Awaited<ReturnType<typeof targets>>[number]

function tooClose(list: Target[]) {
  const found: string[] = []
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i]
      const b = list[j]
      const gapX = Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w))
      const gapY = Math.max(b.y - (a.y + a.h), a.y - (b.y + b.h))
      const sameRow = gapY < 0 && gapX >= 0 && gapX < MIN_GAP
      const sameColumn = gapX < 0 && gapY >= 0 && gapY < MIN_GAP
      if (sameRow || sameColumn)
        found.push(`"${a.label}" ↔ "${b.label}" ${Math.max(gapX, gapY)}px`)
    }
  }
  return found
}

function hasHorizontalScroll(page: Page) {
  return page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  )
}

for (const screen of SCREENS) {
  test.describe(screen.name, () => {
    test("글자가 16px 이상이다", async ({ page }) => {
      await open(page, screen)
      expect(await smallText(page, MIN_FONT)).toEqual([])
    })

    test("터치 영역이 48px 이상이고 8px 이상 떨어져 있다", async ({ page }) => {
      await open(page, screen)
      const list = await targets(page)
      const small = list
        .filter((t) => t.w < MIN_TARGET || t.h < MIN_TARGET)
        .map((t) => `"${t.label}" ${Math.round(t.w)}×${Math.round(t.h)}`)
      expect(small).toEqual([])
      expect(tooClose(list)).toEqual([])
    })

    test("글자 대비가 7:1 이상이다", async ({ page }) => {
      await open(page, screen)
      const result = await new AxeBuilder({ page })
        .withRules(["color-contrast-enhanced"])
        .analyze()
      const found = result.violations.flatMap((v) =>
        v.nodes.map((n) => `${n.target.join(" ")}: ${n.failureSummary}`),
      )
      expect(found).toEqual([])
    })

    test("폭 320px에서 가로 스크롤이 없다", async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 700 })
      await open(page, screen)
      expect(await hasHorizontalScroll(page)).toBe(false)
    })

    for (const scale of [1.3, 2]) {
      test(`글자 ${scale * 100}%에서 넘치지 않는다`, async ({ page }) => {
        await open(page, screen)
        await scaleText(page, scale)
        expect(await hasHorizontalScroll(page)).toBe(false)
        const spilled = (await targets(page))
          .filter((t) => t.spill)
          .map((t) => t.label)
        expect(spilled).toEqual([])
      })
    }
  })
}

// A11Y_SHOTS=1일 때만 스크린샷을 남긴다. 검증 문서에 붙이는 용도다.
test.describe("스크린샷", () => {
  test.skip(!process.env.A11Y_SHOTS, "A11Y_SHOTS=1일 때만 실행")
  for (const screen of SCREENS) {
    for (const width of [320, 375]) {
      for (const scale of [1, 1.3, 2]) {
        test(`${screen.name} ${width}px ${scale * 100}%`, async ({ page }) => {
          await page.setViewportSize({ width, height: 812 })
          await open(page, screen)
          if (scale !== 1) await scaleText(page, scale)
          await page.screenshot({
            path: `../docs/work/02-a11y-copy/screenshots/${screen.name}-${width}-${scale * 100}.png`,
            fullPage: !screen.name.startsWith("s4"),
          })
        })
      }
    }
  }
})
```

- [ ] **4단계: 실행 명령.** `frontend/package.json`의 `scripts`에 추가한다.

```json
"a11y": "playwright test"
```

`Makefile`에 추가한다(`.PHONY`에도 `fe-a11y`를 넣는다). 아직 `gate`에는 넣지 않는다.

```make
fe-a11y: ## 빌드된 화면에서 글자 크기·터치 영역·대비·확대를 잰다
	cd $(FE) && pnpm build && pnpm a11y
```

`.gitignore`에 추가한다.

```
frontend/test-results/
frontend/playwright-report/
```

`frontend/vitest.config.mts`의 `include`가 `src/**/*.test.ts`라 `e2e/`는 vitest에 잡히지 않는다. 고치지 않는다.

- [ ] **5단계: 실패하는지 확인**

```bash
make fe-a11y
```

기대: 실패. `s3-strong 글자가 16px 이상이다`에 `12px "수면 체크 리포트 …"`, `s2-check 터치 영역…`에 `"이전 질문" 36×36`, `not-found`는 영어 기본 화면이라 통과하거나 대비에서 실패한다. 스크립트 자체의 오류(선택자 못 찾음, 서버 안 뜸)로 실패하면 그것부터 고친다. 실패 목록을 작업 3~5의 구현자에게 넘길 수 있게 저장한다.

```bash
make fe-a11y > /tmp/a11y-before.txt 2>&1 || true
```

- [ ] **6단계: 타입·린트·포맷 확인 후 커밋**

```bash
cd frontend && pnpm exec tsc --noEmit && pnpm lint && pnpm format && cd ..
git add frontend/playwright.config.ts frontend/e2e frontend/package.json frontend/pnpm-lock.yaml Makefile .gitignore
git commit -m "test: add a browser check for text size, tap targets, contrast, and text scaling"
```

### 작업 2: 공통 토큰, `lib` 문구, 빠진 화면

**파일:**
- 수정 `frontend/src/app/globals.css`, `frontend/src/lib/sleep-check.ts`, `frontend/src/app/layout.tsx`, `DESIGN.md`
- 생성 `frontend/src/app/not-found.tsx`, `frontend/src/app/error.tsx`

**제공하는 것:** 작업 3~5가 쓰는 토큰 값. 클래스 이름은 그대로다.

- [ ] **1단계: 토큰.** `globals.css`의 `:root`에서 아래 값만 바꾼다. 대비는 토큰을 sRGB로 바꿔 계산했다(괄호 안은 카드 위 대비).

| 토큰 | 지금 | 바꿀 값 |
|---|---|---|
| `--muted-foreground` | `oklch(0.755 0.038 277)` (6.1) | `oklch(0.82 0.038 277)` (7.6) |
| `--warning` | `oklch(0.741 0.133 38)` (5.5) | `oklch(0.84 0.133 38)` (7.3) |
| `--chart-2` | `oklch(0.741 0.133 38)` | `oklch(0.84 0.133 38)` |
| `--chart-3` | `oklch(0.755 0.038 277)` | `oklch(0.82 0.038 277)` |
| `--destructive` | `oklch(0.704 0.191 22.216)` (4.6) | `oklch(0.82 0.11 22.216)` (7.2) |
| `--border` | `oklch(0.981 0.018 81 / 14%)` (2.6) | `oklch(0.981 0.018 81 / 20%)` (3.3) |
| `--sidebar-border` | `oklch(0.981 0.018 81 / 14%)` | `oklch(0.981 0.018 81 / 20%)` |

- [ ] **2단계: 동작 줄이기.** `globals.css`의 `@layer base` 안, `h1, h2` 규칙 뒤에 추가한다.

```css
  /* "동작 줄이기"를 켠 사람에게는 전환 효과를 보여주지 않는다. */
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
```

- [ ] **3단계: 체크 문항과 판정 문구.** `frontend/src/lib/sleep-check.ts`

| 위치 | 지금 | 바꿀 문구 | 감사 번호 |
|---|---|---|---|
| `QUESTIONS` `pressure` | 고혈압이 있어요 | 남편에게 고혈압이 있어요 | 21 |
| `QUESTIONS` `age` | 50세 이상이에요 | 남편이 50세 이상이에요 | 22 |
| `QUESTIONS` `body` | 최근 몇 년 사이 체중이 늘었어요 | 남편이 최근 몇 년 사이 체중이 늘었어요 | 23 |
| `LEVEL_COPY.weak.body` | 그래도 걱정된다면 상담은 언제든 괜찮아요. | 그래도 걱정되면 언제든 상담받아 보세요. | 46 |

문항의 `id`와 순서는 그대로라 리포트 해시 버전(`v1`)을 올리지 않는다. `sleep-check.test.ts`는 문구를 검사하지 않아 고칠 것이 없다.

- [ ] **4단계: 없는 주소 화면.** `frontend/src/app/not-found.tsx`

```tsx
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "cn"

export const metadata = { title: "페이지를 찾을 수 없어요" }

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-screen-md flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-bold">페이지를 찾을 수 없어요</h1>
      <p className="text-lg text-muted-foreground">
        주소가 바뀌었거나 잘못 들어왔어요.
      </p>
      <Link
        href="/"
        className={cn(buttonVariants(), "min-h-14 px-6 text-lg whitespace-normal")}
      >
        처음으로 가기
      </Link>
    </main>
  )
}
```

- [ ] **5단계: 오류 화면.** `frontend/src/app/error.tsx`

```tsx
"use client"

import { Button } from "@/components/ui/button"

export default function ErrorPage({ retry }: { retry: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-screen-md flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-bold">문제가 생겼어요</h1>
      <p className="text-lg text-muted-foreground">
        잠시 뒤에 다시 눌러 주세요.
      </p>
      <Button
        className="min-h-14 px-6 text-lg whitespace-normal"
        onClick={() => retry()}
      >
        다시 시도
      </Button>
    </main>
  )
}
```

- [ ] **6단계: 서비스 이름.** `layout.tsx`의 `title: "코골이 체크"`는 그대로 둔다(이 이름으로 통일한다). 고칠 것이 없으면 건너뛴다.

- [ ] **7단계: 용어표.** `DESIGN.md` 1절 원칙 5 아래에 추가한다.

```markdown
**용어** (화면마다 같은 말을 쓴다)

| 대상 | 쓰는 말 | 쓰지 않는 말 |
|---|---|---|
| 서비스 이름 | 코골이 체크 | 코골이체커 |
| 병 | 수면무호흡증 | 수면무호흡 |
| 병원에서 받는 검사 | 수면검사 (정식 이름 "수면다원검사"는 검사 단계 설명에서 괄호로 한 번) | 수면무호흡 검사 |
| 우리 서비스에서 하는 것 | 무료진단 (광고 소재와 같은 말). 리포트에는 "이 리포트는 진단이 아니에요"를 반드시 둔다 | 검사 |
| 묻는 것 / "네"라고 답한 것 | 질문 / 신호 | 문항, 항목 |
| 답 | 답 | 응답 |
| 코 고는 사람 | 남편 (공유받은 리포트에서는 "당신") | 배우자, 본인, 옆 사람 |
| 답하는 사람 | 부르지 않는다. 필요하면 "옆에서 본", "함께 자는 사람" | 배우자 |
| 찾는 곳 / 카드 하나 | 수면클리닉 / 병원 | |
| 심한 정도 | 심한 경우 (출처 줄만 의학 용어) | 중증, 중등도 |
```

- [ ] **8단계: 확인과 커밋**

```bash
make fe-check
git add frontend/src/app/globals.css frontend/src/lib/sleep-check.ts frontend/src/app/not-found.tsx frontend/src/app/error.tsx DESIGN.md
git commit -m "feat: raise contrast tokens, honor reduced motion, and add not-found and error screens"
```

### 작업 3: S1 체크 시작, S2 체크

**파일:** 수정 `frontend/src/components/sleep/landing.tsx`, `frontend/src/components/sleep/check-flow.tsx`

**쓰는 것:** 작업 2의 토큰. `make fe-a11y`의 `s1-start`, `s2-check`, `s2-check-back`.

- [ ] **1단계: 지금 실패하는 항목 확인**

```bash
cd frontend && pnpm build && pnpm exec playwright test -g "s1-start|s2-check"
```

- [ ] **2단계: `landing.tsx`**

| 위치 | 지금 | 바꿀 것 |
|---|---|---|
| 브랜드 라벨 | `text-sm font-semibold text-muted-foreground`, "코골이체커" | `text-base font-semibold text-muted-foreground`, "코골이 체크" (3) |
| 보조 문구 | 숨이 멈추는 코골이는 치료로 나아질 수 있는 병일 수 있어요 | 숨이 멈추는 코골이는 병일 수 있어요. 치료하면 나아질 수 있어요 (7) |
| `POINTS[1]` | 수면무호흡 검사는 건강보험이 돼요 | 수면검사는 건강보험이 돼요 (9) |
| `POINTS` 항목 | `py-3 text-base` | `py-3 text-lg` |
| 주요 버튼 | `h-12 w-full text-base` | `min-h-14 w-full py-2 text-lg whitespace-normal` |
| 고정 바 | 버튼만 있음 | 버튼 아래에 처리방침 링크 추가 (아래 코드) |

고정 바는 이렇게 된다.

```tsx
<div className="sticky bottom-0 flex flex-col gap-2 border-t bg-background p-4">
  <Link
    href={`/check?from=${headline}`}
    className={cn(
      buttonVariants(),
      "min-h-14 w-full py-2 text-lg whitespace-normal",
    )}
  >
    지금 바로 3분 체크하기
  </Link>
  <Link
    href="/privacy"
    className="flex min-h-12 items-center justify-center text-base text-muted-foreground underline underline-offset-4"
  >
    개인정보처리방침 보기
  </Link>
</div>
```

- [ ] **3단계: `check-flow.tsx`**

| 위치 | 지금 | 바꿀 것 |
|---|---|---|
| 뒤로 가기 | `size="icon-lg"`, `aria-label="이전 질문"`, 아이콘 `size-5` | `size="icon-lg"` 유지 + `className="size-12"`, `aria-label="이전 질문으로 가기"` (13), 아이콘 `size-6` |
| 머리 영역 | `flex h-14 items-center` | `flex min-h-14 items-center` |
| 진행 막대 | `role="progressbar"`에 이름 없음 | `aria-label="진행 상황"` 추가 |
| 안내 문구 | `mt-6 text-sm text-muted-foreground tabular-nums`, "옆에서 본 대로 답해 주세요" | `mt-6 text-base text-muted-foreground tabular-nums`, "남편을 옆에서 본 대로 답해 주세요" |
| 선택지 | `h-14 w-full justify-start px-4 text-base` | `h-auto min-h-14 w-full justify-start px-4 py-3 text-left text-lg whitespace-normal` |

전환 효과의 `motion-reduce:animate-none`은 그대로 둔다.

- [ ] **4단계: 통과 확인**

```bash
cd frontend && pnpm build && pnpm exec playwright test -g "s1-start|s2-check"
```

기대: 세 화면의 6개 검사가 모두 통과. 실패가 남으면 출력된 요소를 고친다. 글자 200%에서 버튼 글자가 넘치면 그 버튼에 `h-auto`와 `whitespace-normal`이 있는지 본다.

- [ ] **5단계: 정적 검사와 커밋**

```bash
cd frontend && pnpm exec tsc --noEmit && pnpm lint && pnpm format:check && cd ..
git add frontend/src/components/sleep/landing.tsx frontend/src/components/sleep/check-flow.tsx
git commit -m "feat: enlarge text and tap targets on the start and check screens"
```

### 작업 4: S3 리포트, 공유 미리보기

**파일:** 수정 `frontend/src/components/sleep/report.tsx`, `report-view.tsx`, `share-button.tsx`, `frontend/src/app/r/page.tsx`, `frontend/src/app/opengraph-image.tsx`

**쓰는 것:** 작업 2의 토큰과 `LEVEL_COPY`. `make fe-a11y`의 `s3-*`.

- [ ] **1단계: 지금 실패하는 항목 확인**

```bash
cd frontend && pnpm build && pnpm exec playwright test -g "s3-"
```

- [ ] **2단계: `report.tsx` 크기와 배치**

| 위치 | 지금 | 바꿀 것 |
|---|---|---|
| `ReportCard`의 `Card` | `text-base` | `text-lg` |
| `ReportCard`의 `CardTitle` | `text-lg font-semibold` | `text-xl font-semibold` |
| `ReportCard`의 `CardDescription` | 기본값(`text-sm`) | `className="text-base"` |
| `CompareBars` 행 | `grid grid-cols-[4.5rem_1fr_3rem] items-center gap-2 text-sm` | `grid grid-cols-[minmax(4.5rem,auto)_1fr_auto] items-center gap-2 text-base` |
| `Source` | `text-xs text-muted-foreground` | `text-base text-muted-foreground` |
| 머리말 | `text-xs text-muted-foreground tabular-nums` | `text-base text-muted-foreground tabular-nums` |
| 공유받은 리포트 한 줄 | `text-sm font-semibold text-primary` | `text-lg font-semibold text-primary` |
| 단계 칩 `Badge` | 기본값(`text-xs`) | `className`에 `h-auto px-3 py-1 text-base` 추가 |
| 판정 설명 `copy.body` | `text-base text-muted-foreground` | `text-lg text-muted-foreground` |
| 수면무호흡증 설명 | `text-sm text-muted-foreground` | `text-lg text-muted-foreground` |
| 신호 아이콘 | `mt-1 size-4` | `mt-1 size-5` |
| "주요 신호" | `mt-1 shrink-0 text-xs text-warning` | `shrink-0 text-base font-semibold text-warning` |
| 단계 번호 원 | `size-6 … text-xs` | `size-8 … text-base` |
| 단계 설명 `step.note` | `text-sm text-muted-foreground` | `text-base text-muted-foreground` |
| `AccordionTrigger` | `items-center py-3 text-base` | `min-h-12 items-center py-3 text-lg` |
| `AccordionContent` | `text-muted-foreground` | `text-base text-muted-foreground` |
| 면책 문구 | `text-xs text-muted-foreground` | `text-base text-muted-foreground` |

판정 단계는 칩 글자, 주요 신호는 아이콘과 "주요 신호" 글자가 이미 색과 함께 쓰인다. 막대는 끝에 숫자가 있다. 색만으로 구분하는 곳을 새로 만들지 않는다.

- [ ] **3단계: `report.tsx` 문구.** 지금 문구가 파일에 없으면 건너뛰고 보고한다.

| 지금 | 바꿀 문구 | 감사 번호 |
|---|---|---|
| 수면 체크 리포트 · {date} · 배우자 관찰 {QUESTIONS.length}문항 | 수면 체크 리포트 · {date} · 옆에서 본 {QUESTIONS.length}가지 질문 | 35 |
| 한 시간에 15번 이상, 하룻밤이면 100번이 넘어요 | 심한 편이면 한 시간에 15번 넘게 깨요. 하룻밤이면 100번이 넘어요 | 54 |
| `label: "미치료"` | `label: "치료 안 함"` | 61 |
| 심한 경우 심혈관 질환 위험이 2.9배 높았어요 | 심한 경우 심장·혈관 병(심혈관 질환) 위험이 2.9배 높았어요 | 63 |
| `summary="심혈관 질환 위험: 일반인 1, 치료하지 않은 중증 수면무호흡증 2.9배"` | `summary="심장·혈관 병 위험: 일반인 1, 심한데 치료하지 않으면 2.9배"` | 64 |
| `label: "중증 미치료"` | `label: "심한데 치료 안 함"` | 65 |
| `note="본인부담 약 12~14만 원"` | `note="내가 내는 돈은 약 12~14만 원이에요"` | 95 |
| 수면클리닉 외래 상담 | 수면클리닉에서 진료 상담받기 | 96 |
| 하룻밤 수면다원검사 | 병원에서 하룻밤 자면서 검사받기(수면다원검사) | 97 |
| 병원에서 쓰는 수면무호흡 선별 기준(STOP-Bang)의 항목을 배우자가 옆에서 볼 수 있는 것으로 바꿔 만들었어요. | 병원에서 수면무호흡증을 가려낼 때 쓰는 질문(STOP-Bang)을 바탕으로 만들었어요. 옆에서 볼 수 있는 것만 묻도록 바꿨어요. | 101 |
| 숨 멈춤과 헐떡임은 미국수면학회 진료 지침이 수면무호흡을 의심하는 주요 증상으로 꼽아요. | 숨 멈춤과 헐떡임은 미국수면학회가 꼽는 주요 증상이에요. | 102 |
| 이 리포트는 진단이 아니에요. 정확한 판단은 진료로 받아요. | 이 리포트는 진단이 아니에요. 정확한 것은 병원 진료로 확인하세요. | 106 |

감사 70, 78, 84번은 감사 뒤에 문구가 바뀌어 지금 파일에 없다. 고치지 않는다.

- [ ] **4단계: `report.tsx` 처리방침 링크.** `footer`의 면책 문구 `<p>` 뒤에 추가한다(`Link`를 `next/link`에서 import).

```tsx
<Link
  href="/privacy"
  className="flex min-h-12 items-center text-base text-muted-foreground underline underline-offset-4"
>
  개인정보처리방침 보기
</Link>
```

- [ ] **5단계: `report-view.tsx`, `share-button.tsx`**

| 파일 | 위치 | 지금 | 바꿀 것 |
|---|---|---|---|
| `report-view.tsx` | 리포트 없음 문구 | `text-base` | `text-lg` |
| `report-view.tsx` | "다시 체크하기" 링크 | `buttonVariants()` | `cn(buttonVariants(), "min-h-14 px-6 text-lg whitespace-normal")`, 글자는 `shared ? "체크하기" : "다시 체크하기"` |
| `report-view.tsx` | 주요 버튼 | `h-12 w-full text-base` | `min-h-14 w-full py-2 text-lg whitespace-normal` |
| `report-view.tsx` | 고정 바 | `flex flex-col gap-1` | `flex flex-col gap-2` |
| `share-button.tsx` | 버튼 | `h-11 w-full text-base` | `h-auto min-h-12 w-full py-2 text-lg whitespace-normal` |
| `share-button.tsx` | 실패 토스트 | 링크를 복사하지 못했어요. 다시 시도해 주세요 | 링크를 복사하지 못했어요. 한 번 더 눌러 주세요 (34) |

- [ ] **6단계: 미리보기 문구**

| 파일 | 지금 | 바꿀 문구 | 감사 번호 |
|---|---|---|---|
| `app/r/page.tsx` `description` | 옆에서 본 코골이로 정리한 수면무호흡 신호와 검사 방법 | 옆에서 본 코골이, 병원에 가볼 만한지 알려드려요 | 146 |
| `app/opengraph-image.tsx` | 배우자 관찰 | 옆에서 본 9가지 | 144 |

- [ ] **7단계: 통과 확인**

```bash
cd frontend && pnpm build && pnpm exec playwright test -g "s3-"
```

기대: 네 화면의 6개 검사가 모두 통과. 대비 검사가 `bg-warning` 칩에서 실패하면 칩 글자색이 `text-background`인지 확인한다(작업 2의 새 `--warning` 위에서 8.5:1).

- [ ] **8단계: 정적 검사와 커밋**

```bash
cd frontend && pnpm exec tsc --noEmit && pnpm lint && pnpm format:check && cd ..
git add frontend/src/components/sleep/report.tsx frontend/src/components/sleep/report-view.tsx frontend/src/components/sleep/share-button.tsx frontend/src/app/r/page.tsx frontend/src/app/opengraph-image.tsx
git commit -m "feat: enlarge the report text and rewrite hard words in plain language"
```

### 작업 5: S4 근처 수면클리닉, 처리방침

**파일:** 수정 `frontend/src/app/clinics/page.tsx`, `frontend/src/components/clinics/clinic-finder.tsx`, `clinic-card.tsx`, `frontend/src/app/privacy/page.tsx`

**쓰는 것:** 작업 2의 토큰. `make fe-a11y`의 `s4-*`, `privacy`.

- [ ] **1단계: 지금 실패하는 항목 확인**

```bash
cd frontend && pnpm build && pnpm exec playwright test -g "s4-|privacy"
```

- [ ] **2단계: `clinics/page.tsx`**

| 위치 | 지금 | 바꿀 것 |
|---|---|---|
| 빈 데이터 안내 | `text-base` | `text-lg` |
| 빈 데이터 버튼 | `h-12 px-4 text-base` | `min-h-14 px-4 py-2 text-lg whitespace-normal` |
| 출처 줄 | `text-xs text-muted-foreground` | `text-base text-muted-foreground` |

- [ ] **3단계: `clinic-card.tsx`**

| 위치 | 지금 | 바꿀 것 |
|---|---|---|
| 병원명 `h2` | `min-w-0 text-base font-semibold [overflow-wrap:anywhere]` | `min-w-0 text-lg font-semibold [overflow-wrap:anywhere]` |
| 거리 | `shrink-0 text-sm text-muted-foreground tabular-nums` | `shrink-0 text-base text-muted-foreground tabular-nums` |
| 주소 | `text-sm text-muted-foreground` | `text-base text-muted-foreground` |
| 버튼 줄 | `flex gap-2` | `flex flex-wrap gap-2` |
| 전화하기 | `h-11 flex-1 text-base` | `h-auto min-h-12 flex-1 py-2 text-lg whitespace-normal` |
| 병원 정보 보기 | `h-11 flex-1 border-primary text-base text-primary` | `h-auto min-h-12 flex-1 border-primary py-2 text-lg whitespace-normal text-primary` |

- [ ] **4단계: `clinic-finder.tsx`**

| 위치 | 지금 | 바꿀 것 |
|---|---|---|
| 보기 방식 줄 | `flex gap-2` | `flex flex-wrap gap-2` |
| 지역 버튼 | `h-11 min-w-0 flex-1 justify-between px-3 text-base` | `h-auto min-h-12 flex-1 justify-between px-3 py-2 text-lg whitespace-normal` |
| 지역 버튼 안 글자 | `<span className="truncate tabular-nums">` | `<span className="text-left tabular-nums">` |
| 지역 버튼 글자(내 주변 방식일 때) | 지역 선택 | 지역 고르기 (113) |
| 내 주변 버튼 | `h-11 shrink-0 px-3 text-base` | `h-auto min-h-12 flex-1 px-3 py-2 text-lg whitespace-normal` |
| 위치 오류 | `text-sm text-muted-foreground` | `text-base text-muted-foreground` |
| 시트 제목 | 지역 선택 | 지역 고르기 (114) |
| 시트 닫기 | `size-11` | `size-12` |
| 빈 상태 안내 | `text-base` | `text-lg` |
| 빈 상태 버튼 | `h-11 px-4 text-base` | `min-h-12 px-4 py-2 text-lg whitespace-normal` |
| 지역 소제목 | `text-lg font-semibold` | `text-xl font-semibold` |
| `RegionOption` 버튼 | `h-11 justify-between px-3 text-base` | `h-auto min-h-12 justify-between px-3 py-2 text-lg whitespace-normal` |
| `RegionOption` 건수 | `text-sm text-muted-foreground tabular-nums` | `text-base text-muted-foreground tabular-nums` |

`SheetTitle`의 기본 글자 크기가 16px 미만이면 `className="text-xl"`을 준다(`components/ui/sheet.tsx`를 읽어 확인한다). 시트가 화면보다 길어지면 `SheetContent`에 `max-h-[85dvh] overflow-y-auto`를 준다.

- [ ] **5단계: `privacy/page.tsx`**

| 위치 | 지금 | 바꿀 것 | 감사 번호 |
|---|---|---|---|
| 적용일 줄 | `text-sm text-muted-foreground`, "코골이체커 · 2026년 10월 2일부터 적용" | `text-base text-muted-foreground`, "코골이 체크 · 2026년 10월 2일부터 적용" | 130 |
| 섹션 제목 `h2` | `text-lg font-semibold` | `text-xl font-semibold` | |
| 본문 `ul` | `text-base` | `text-lg` | |
| 체크 응답 1 | 체크에 답한 내용은 서버에 저장하지 않고 어디로도 보내지 않아요. | 체크에 답한 내용은 어디에도 저장하지 않고 보내지 않아요. | 132 |
| 체크 응답 2 | 응답은 리포트 주소의 # 뒤에만 담기고, 이 부분은 브라우저 밖으로 전송되지 않아요. | 답은 리포트 주소(링크) 안에만 담겨요. 이 주소를 받은 사람만 리포트를 볼 수 있어요. | 133 |
| 방문 기록 2 | Google 애널리틱스: 방문한 페이지, 체크 시작·완료와 결과 단계, 리포트 보내기와 병원 찾기 클릭, 기기와 브라우저 정보 | Google 애널리틱스에는 본 화면, 체크 시작과 완료, 결과 단계, 누른 버튼, 기기 종류를 보내요. | 136 |
| 방문 기록 3 | Meta 픽셀: 방문한 페이지, 체크 완료, 병원 찾기 클릭. 결과 단계와 응답은 보내지 않아요. | Meta 픽셀에는 본 화면, 체크 완료, 병원 찾기를 눌렀는지만 보내요. 결과 단계와 답은 보내지 않아요. | 137 |
| 섹션 제목 | 보관과 거부 | 기록 보관과 끄는 방법 | 139 |
| 보관 1 | 방문 기록은 Google과 Meta의 정책에 따라 보관돼요. | 방문 기록은 Google과 Meta가 각자 정한 기간 동안 보관해요. | 140 |

처리방침 맨 아래에 처음 화면으로 가는 링크를 둔다.

```tsx
<Link
  href="/"
  className="flex min-h-12 items-center text-lg text-primary underline underline-offset-4"
>
  처음으로 가기
</Link>
```

- [ ] **6단계: 통과 확인**

```bash
cd frontend && pnpm build && pnpm exec playwright test -g "s4-|privacy"
```

기대: 세 화면의 6개 검사가 모두 통과. 병원 카드 337개의 버튼 간격(8px)과 글자 200%에서 버튼이 줄바꿈되는지가 주로 걸린다.

- [ ] **7단계: 정적 검사와 커밋**

```bash
cd frontend && pnpm exec tsc --noEmit && pnpm lint && pnpm format:check && cd ..
git add frontend/src/app/clinics/page.tsx frontend/src/components/clinics frontend/src/app/privacy/page.tsx
git commit -m "feat: enlarge text and tap targets on the clinic list and privacy page"
```

### 작업 6: 게이트 편입, 스크린샷, 검증

**파일:** 수정 `Makefile`, `.github/workflows/gate.yml`, `docs/work/02-a11y-copy/verification.md` · 생성 `docs/work/02-a11y-copy/screenshots/*.png`

- [ ] **1단계: 전체 통과 확인**

```bash
make fe-a11y
grep -rnE "text-(xs|sm)\b|truncate|line-clamp" frontend/src/app frontend/src/components/sleep frontend/src/components/clinics
grep -rn "코골이체커" frontend/src
```

기대: 화면 11개 × 검사 6개 = 66개 통과, 두 `grep` 모두 결과 없음.

- [ ] **2단계: 게이트에 넣기.** `Makefile`

```make
gate: fe-check crawler-check fe-a11y
	@echo "GATE PASS"
```

`fe-check`가 이미 빌드하므로 `fe-a11y`의 `pnpm build`가 한 번 더 돈다. 순서에 기대지 않게 그대로 둔다.

`.github/workflows/gate.yml`의 `make gate` 앞에 추가한다.

```yaml
      - run: pnpm --dir frontend exec playwright install --with-deps chromium
```

- [ ] **3단계: 스크린샷**

```bash
cd frontend && pnpm build && A11Y_SHOTS=1 pnpm exec playwright test -g "스크린샷" && cd ..
ls docs/work/02-a11y-copy/screenshots | wc -l
```

기대: 66장(화면 11 × 폭 2 × 글자 3). 320px·200% 스크린샷을 직접 열어 겹침과 잘림을 본다.

- [ ] **4단계: 검증.** `/gate`로 `verifier`와 `design-reviewer`를 돌려 [verification.md](verification.md)의 A1~A15를 판정받는다(A13은 사용자 확인으로 남긴다). 결과를 `docs/work/02-a11y-copy/verification.md`의 "결과"에 적는다.

- [ ] **5단계: 커밋과 푸시**

```bash
make gate
git add Makefile .github/workflows/gate.yml docs/work/02-a11y-copy/verification.md docs/work/02-a11y-copy/screenshots
git commit -m "test: gate on the accessibility check and record the screenshot matrix"
git push
```
