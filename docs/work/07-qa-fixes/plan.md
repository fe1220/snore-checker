# 프로덕션 QA 반영 구현 계획

상태: 승인

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 프로덕션 QA에서 나온 6건(죽은 홈페이지 링크, "잘 모르겠어요" 판정, 신호 약함의 위험 카드, 정렬 문서, 선택 버튼 hover, 주소 링크)을 고친다.

**Architecture:** 크롤러가 홈페이지 접속을 확인해 죽은 링크를 지운다. `lib/sleep-check`가 공유 해시 v2("네"+"잘 모르겠어요")와 "아직 판단하기 일러요" 조건을 정의하고, 리포트 화면은 그 결과만 그린다. 병원 카드는 주소를 항상 지도 링크로 그린다.

**Tech Stack:** Next.js(App Router) + Tailwind v4 + shadcn, vitest, Playwright e2e, 크롤러는 Node 24 + `node:test`

**Spec:** [spec.md](spec.md)

## Global Constraints

- 판정 단계는 3개(strong/moderate/weak) 그대로다. `judge()`는 바꾸지 않는다.
- 공유 해시 v2 형식: `v2-<네 비트 36진수>-<모름 비트 36진수>`. v1(`v1-<네>`)은 계속 읽는다(모름 = 없음).
- "아직 판단하기 일러요" 조건: `level === "weak"` 그리고 주요 신호(`strong`) 문항 중 하나라도 "잘 모르겠어요".
- 문구: 제목 `아직 판단하기 일러요`, 설명 `숨 멈춤은 자는 동안 지켜봐야 알 수 있어요. 며칠 밤 옆에서 본 뒤 다시 해 보세요.`
- GA `check_complete`의 `level`은 그대로 `judge()` 결과다. 응답은 해시 밖으로 보내지 않는다.
- 글자 16px 이상, 터치 48px 이상, 원시 색상값 금지(`DESIGN.md`).
- 레이어: `app → components → lib → data`. 문구·판정은 `lib`에 한 번만 정의한다.
- `frontend/src/data/hospitals.json`은 크롤러만 쓴다. 손으로 고치지 않는다.
- 작업 단위마다 커밋 1개. 푸시 전 `make gate` 통과.

## 작업 단위와 병렬성

| Task | 내용 | 소유 파일 | 담당 | 의존 | 병렬 |
|---|---|---|---|---|---|
| 1 | 죽은 홈페이지 제거 | `crawler/src/homepage.ts`, `homepage.test.ts`, `index.ts` | data-implementer | 없음 | 2·4와 병렬 |
| 2 | 해시 v2 + 판단 보류 조건 | `frontend/src/lib/sleep-check.ts`, `.test.ts` | 메인 세션 (`lib`은 공통 파일) | 없음 | 1·4와 병렬 |
| 3 | 리포트 화면 | `components/sleep/report.tsx`, `report-view.tsx`, `check-flow.tsx`, `e2e/check-flow.spec.ts`, `e2e/a11y.spec.ts` | frontend-implementer | 2 | 1·4와 병렬 |
| 4 | 병원 카드 주소·선택 버튼 | `components/clinics/clinic-card.tsx`, `clinic-finder.tsx` | frontend-implementer | 없음 | 1·2·3과 병렬 |
| 5 | 데이터 재수집 | `frontend/src/data/hospitals.json` | 메인 세션 | 1 | - |
| 6 | 문서 | `docs/ux-spec.md`, `docs/tech-stack.md`, `docs/architecture.md`, `docs/troubleshooting.md` | 메인 세션 | 1–5 | - |

---

### Task 1: 죽은 홈페이지 제거 (크롤러)

**Files:**
- Create: `crawler/src/homepage.ts`
- Create: `crawler/src/homepage.test.ts`
- Modify: `crawler/src/index.ts` (`hospitals = sortById(hospitals)` 바로 앞)

**Interfaces:**
- Produces: `checkHomepage(url: string, retryDelaysMs?: readonly number[]): Promise<string | null>` (죽었으면 이유, 살았으면 `null`), `dropDeadHomepages(hospitals: Hospital[], check?: (url: string) => Promise<string | null>, concurrency?: number): Promise<{ hospitals: Hospital[]; dropped: { hospital: Hospital; reason: string }[] }>`

- [ ] **Step 1: 실패하는 테스트 작성** — `crawler/src/homepage.test.ts`

```ts
import assert from "node:assert/strict"
import { afterEach, mock, test } from "node:test"

import { checkHomepage, dropDeadHomepages } from "./homepage.ts"
import type { Hospital } from "./merge.ts"

const NO_DELAY = [0, 0]

function respond(...results: (number | Error)[]) {
  let call = 0
  return mock.method(globalThis, "fetch", async () => {
    const result = results[Math.min(call++, results.length - 1)]
    if (result instanceof Error) throw result
    return new Response("", { status: result })
  })
}

function hospital(id: string, homepage: string | null): Hospital {
  return {
    id,
    name: `${id}의원`,
    region: "서울",
    address: "서울특별시 중구 을지로 1",
    phone: null,
    lat: 37.566,
    lng: 126.978,
    sourceUrl: null,
    homepage,
    listed: false,
    kind: "의원",
  }
}

afterEach(() => mock.restoreAll())

test("열리는 홈페이지는 null", async () => {
  respond(200)
  assert.equal(await checkHomepage("https://a.example", NO_DELAY), null)
})

test("봇을 막는 403·406은 사람에게 열리므로 살아 있다고 본다", async () => {
  respond(403)
  assert.equal(await checkHomepage("https://a.example", NO_DELAY), null)
  mock.restoreAll()
  respond(406)
  assert.equal(await checkHomepage("https://a.example", NO_DELAY), null)
})

test("404는 두 번 더 확인한 뒤 죽었다고 본다", async () => {
  const fetch = respond(404)
  assert.equal(await checkHomepage("https://a.example", NO_DELAY), "HTTP 404")
  assert.equal(fetch.mock.callCount(), 3)
})

test("DNS·인증서 오류는 cause의 메시지를 이유로 남긴다", async () => {
  respond(new TypeError("fetch failed", { cause: new Error("self-signed certificate") }))
  assert.equal(await checkHomepage("https://a.example", NO_DELAY), "self-signed certificate")
})

test("한 번 실패해도 다시 열리면 살아 있다", async () => {
  respond(503, 200)
  assert.equal(await checkHomepage("https://a.example", NO_DELAY), null)
})

test("죽은 홈페이지만 null로 바꾸고 이유를 남긴다", async () => {
  const dead = new Set(["https://dead.example"])
  const check = async (url: string) => (dead.has(url) ? "HTTP 404" : null)
  const { hospitals, dropped } = await dropDeadHomepages(
    [
      hospital("a", "https://dead.example"),
      hospital("b", "https://ok.example"),
      hospital("c", "https://ok2.example"),
      hospital("d", null),
    ],
    check,
  )
  assert.deepEqual(
    hospitals.map((h) => [h.id, h.homepage]),
    [
      ["a", null],
      ["b", "https://ok.example"],
      ["c", "https://ok2.example"],
      ["d", null],
    ],
  )
  assert.deepEqual(
    dropped.map((d) => [d.hospital.id, d.reason]),
    [["a", "HTTP 404"]],
  )
})

test("같은 주소는 한 번만 확인한다", async () => {
  let calls = 0
  const check = async () => {
    calls++
    return null
  }
  await dropDeadHomepages([hospital("a", "https://x.example"), hospital("b", "https://x.example")], check)
  assert.equal(calls, 1)
})

// 러너 네트워크가 끊기면 모든 홈페이지가 죽은 것처럼 보인다. 그때는 저장하지 않는다.
test("절반 넘게 죽었으면 네트워크 문제로 보고 실패한다", async () => {
  const check = async () => "fetch failed"
  await assert.rejects(
    dropDeadHomepages([hospital("a", "https://a.example"), hospital("b", "https://b.example")], check),
    /홈페이지/,
  )
})
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm --dir crawler test`
Expected: FAIL, `Cannot find module './homepage.ts'`

- [ ] **Step 3: 구현** — `crawler/src/homepage.ts`

```ts
import type { Hospital } from "./merge.ts"

// 일부 병원 사이트는 크롤러 UA를 막는다. 사용자가 실제로 여는 것과 같게 휴대폰 브라우저 UA로 확인한다.
const USER_AGENT =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"
const TIMEOUT_MS = 15_000
// 일시 장애로 멀쩡한 링크를 지우지 않도록 두 번 더 확인한다.
const RETRY_DELAYS_MS = [1000, 3000]
const CONCURRENCY = 8

// 없는 페이지와 서버 오류만 죽은 것으로 본다. 403·406처럼 봇을 막는 응답은 사람에게는 열린다.
function deadStatus(status: number): boolean {
  return status === 404 || status === 410 || status >= 500
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function checkOnce(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(TIMEOUT_MS) })
    await res.body?.cancel()
    return deadStatus(res.status) ? `HTTP ${res.status}` : null
  } catch (error) {
    // DNS 실패, 연결 거부, 인증서 오류는 fetch가 TypeError로 감싸고 원인을 cause에 둔다.
    if (error instanceof Error && error.cause instanceof Error) return error.cause.message
    return error instanceof Error ? error.message : String(error)
  }
}

export async function checkHomepage(url: string, retryDelaysMs: readonly number[] = RETRY_DELAYS_MS): Promise<string | null> {
  let reason = await checkOnce(url)
  for (const delay of retryDelaysMs) {
    if (reason === null) return null
    await sleep(delay)
    reason = await checkOnce(url)
  }
  return reason
}

export type DroppedHomepage = { hospital: Hospital; reason: string }

// 열리지 않는 홈페이지를 지운다. 화면은 홈페이지가 없으면 네이버 지도 검색으로 보낸다(frontend/src/lib/hospitals.ts clinicLink).
export async function dropDeadHomepages(
  hospitals: Hospital[],
  check: (url: string) => Promise<string | null> = checkHomepage,
  concurrency = CONCURRENCY,
): Promise<{ hospitals: Hospital[]; dropped: DroppedHomepage[] }> {
  const urls = [...new Set(hospitals.flatMap((h) => (h.homepage ? [h.homepage] : [])))]
  const dead = new Map<string, string>()
  let next = 0
  async function worker() {
    while (next < urls.length) {
      const url = urls[next++]
      const reason = await check(url)
      if (reason !== null) dead.set(url, reason)
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, urls.length) }, worker))

  if (dead.size > urls.length / 2) {
    throw new Error(`홈페이지 ${urls.length}곳 중 ${dead.size}곳이 열리지 않습니다. 네트워크 문제일 수 있어 저장하지 않습니다`)
  }

  const dropped: DroppedHomepage[] = []
  const result = hospitals.map((h) => {
    const reason = h.homepage ? dead.get(h.homepage) : undefined
    if (reason === undefined) return h
    dropped.push({ hospital: h, reason })
    return { ...h, homepage: null }
  })
  return { hospitals: result, dropped }
}
```

- [ ] **Step 4: `index.ts`에 연결** — import를 추가하고 `hospitals = sortById(hospitals)` 바로 앞에 넣는다.

```ts
import { dropDeadHomepages } from "./homepage.ts"
```

```ts
  const checked = await dropDeadHomepages(hospitals)
  hospitals = checked.hospitals
  console.log(`열리지 않아 지운 홈페이지: ${checked.dropped.length}곳`)
  for (const { hospital, reason } of checked.dropped) console.log(`  ${hospital.name} | ${hospital.homepage} | ${reason}`)
```

- [ ] **Step 5: 통과 확인**

Run: `pnpm --dir crawler test && pnpm --dir crawler typecheck`
Expected: PASS

- [ ] **Step 6: 커밋**

```bash
git add crawler/src/homepage.ts crawler/src/homepage.test.ts crawler/src/index.ts
git commit -m "feat: drop clinic homepages that no longer open"
```

---

### Task 2: 공유 해시 v2와 판단 보류 조건 (lib)

**Files:**
- Modify: `frontend/src/lib/sleep-check.ts`
- Modify: `frontend/src/lib/sleep-check.test.ts`

**Interfaces:**
- Produces:
  - `type ReportAnswers = { signals: Question[]; unknowns: Question[] }`
  - `toReportHash(answers: ReportAnswers): string` → `"v2-<네>-<모름>"`
  - `fromReportHash(hash: string): ReportAnswers | null` (v1이면 `unknowns: []`)
  - `isTooEarly(level: Level, unknowns: Question[]): boolean`
  - `TOO_EARLY_COPY: { title: string; body: string }`
- 기존 `toReportHash(signals)` / `fromReportHash(): Question[]` 시그니처는 없어진다. 호출부는 Task 3이 고친다.

- [ ] **Step 1: 테스트 수정** — `describe("toReportHash / fromReportHash")` 블록 전체를 아래로 바꾸고, 파일 끝에 `isTooEarly` 블록을 추가한다. import에 `isTooEarly`를 더한다.

```ts
function answers(yes: string[], unknown: string[] = []) {
  return { signals: pick(yes), unknowns: pick(unknown) }
}

describe("toReportHash / fromReportHash", () => {
  it("해시에 문항 id 같은 읽을 수 있는 단어가 없다", () => {
    expect(toReportHash(answers(["apnea", "pressure"], ["gasp"]))).toMatch(
      /^v2-[0-9a-z]{1,2}-[0-9a-z]{1,2}$/,
    )
  })

  it("만든 해시를 읽으면 같은 답이 나온다", () => {
    for (const [yes, unknown] of [
      [[], []],
      [["apnea"], []],
      [[], ["apnea", "gasp", "drowsy-driving"]],
      [["snore-often", "age"], ["apnea", "body"]],
      [QUESTIONS.map((q) => q.id), []],
    ]) {
      expect(fromReportHash(toReportHash(answers(yes, unknown)))).toEqual(
        answers(yes, unknown),
      )
    }
  })

  // 이미 퍼진 공유 링크가 같은 답으로 읽혀야 한다. 문항 순서를 바꾸면 이 테스트가 깨지고, 그때는 버전을 올린다.
  it("v2 해시 형식이 고정돼 있다", () => {
    expect(toReportHash(answers([]))).toBe("v2-0-0")
    expect(toReportHash(answers(QUESTIONS.map((q) => q.id)))).toBe("v2-e7-0")
    expect(toReportHash(answers([], ["apnea"]))).toBe("v2-0-4")
  })

  it("v1 링크는 계속 같은 답으로 읽고 모름은 없다고 본다", () => {
    expect(fromReportHash("v1-0")).toEqual(answers([]))
    expect(fromReportHash("v1-e7")).toEqual(answers(QUESTIONS.map((q) => q.id)))
    expect(fromReportHash("v1-3n")).toEqual(
      answers(["snore-often", "snore-loud", "age"]),
    )
    expect(judge(fromReportHash("v1-3n")!.signals)).toBe("moderate")
  })

  it("앞의 #은 있어도 없어도 읽는다", () => {
    expect(fromReportHash("#v2-0-0")).toEqual(answers([]))
    expect(fromReportHash("v1-0")).toEqual(answers([]))
  })

  it("버전이 다르거나 잘못된 해시는 null", () => {
    for (const hash of [
      "",
      "#",
      "0",
      "v3-0",
      "v1-",
      "v1-zz",
      "v1-abc",
      "v1-A1",
      "v1-0-0",
      "v2-0",
      "v2-0-",
      "v2-zz-0",
      // 같은 문항이 "네"이면서 "모름"일 수 없다
      "v2-4-4",
      "dh",
    ]) {
      expect(fromReportHash(hash)).toBeNull()
    }
  })
})

describe("isTooEarly", () => {
  it("신호 약함이고 주요 신호 문항을 모르면 true", () => {
    expect(isTooEarly("weak", pick(["apnea"]))).toBe(true)
  })

  it("모르는 문항이 주요 신호가 아니면 false", () => {
    expect(isTooEarly("weak", pick(["age", "body"]))).toBe(false)
  })

  it("신호 약함이 아니면 false", () => {
    expect(isTooEarly("moderate", pick(["apnea"]))).toBe(false)
  })
})
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm --dir frontend test -- sleep-check`
Expected: FAIL (`isTooEarly` 없음, 해시 형식 불일치)

- [ ] **Step 3: 구현** — `sleep-check.ts`의 `// 문항마다 비트 하나를…`부터 `fromReportHash` 끝까지를 바꾸고, `LEVEL_COPY` 아래에 판단 보류를 추가한다.

```ts
// 문항마다 비트 하나를 쓰고 36진수로 줄인다. 건강 정보가 단어로 주소에 남지 않게 하려는 것이고 암호화는 아니다.
const MAX_CODE = 2 ** QUESTIONS.length - 1
const CODE_PATTERN = new RegExp(`^[0-9a-z]{1,${MAX_CODE.toString(36).length}}$`)

function encodeBits(questions: Question[]): string {
  const ids = new Set(questions.map((q) => q.id))
  return QUESTIONS.reduce(
    (acc, q, index) => (ids.has(q.id) ? acc | (1 << index) : acc),
    0,
  ).toString(36)
}

function decodeBits(code: string): number | null {
  if (!CODE_PATTERN.test(code)) return null
  const bits = parseInt(code, 36)
  return bits > MAX_CODE ? null : bits
}

const fromBits = (bits: number) =>
  QUESTIONS.filter((_, index) => bits & (1 << index))

export type ReportAnswers = { signals: Question[]; unknowns: Question[] }

// 응답은 주소 해시에만 담는다. 해시는 서버·분석 도구로 전송되지 않는다.
// v2: "네"와 "잘 모르겠어요"를 따로 담는다(#v2-<네>-<모름>).
// v1: "네"만 담던 이전 형식(#v1-<네>). 이미 퍼진 공유 링크라 계속 읽는다.
// 문항이 바뀌면 버전을 올려 옛 링크가 다른 문항으로 해석되지 않게 한다.
export function toReportHash({ signals, unknowns }: ReportAnswers): string {
  return `v2-${encodeBits(signals)}-${encodeBits(unknowns)}`
}

export function fromReportHash(hash: string): ReportAnswers | null {
  const parts = hash.replace(/^#/, "").split("-")
  if (parts[0] === "v1" && parts.length === 2) {
    const yes = decodeBits(parts[1])
    return yes === null ? null : { signals: fromBits(yes), unknowns: [] }
  }
  if (parts[0] === "v2" && parts.length === 3) {
    const yes = decodeBits(parts[1])
    const unknown = decodeBits(parts[2])
    if (yes === null || unknown === null || yes & unknown) return null
    return { signals: fromBits(yes), unknowns: fromBits(unknown) }
  }
  return null
}
```

```ts
// 주요 신호는 자는 동안 봐야 알 수 있다. 그걸 모르는데 "신호가 적다"고 하면 잘못된 안심을 준다.
// 단계는 그대로 두고 제목·설명만 바꾼다.
export function isTooEarly(level: Level, unknowns: Question[]): boolean {
  return level === "weak" && unknowns.some((q) => q.strong)
}

export const TOO_EARLY_COPY = {
  title: "아직 판단하기 일러요",
  body: "숨 멈춤은 자는 동안 지켜봐야 알 수 있어요. 며칠 밤 옆에서 본 뒤 다시 해 보세요.",
}
```

- [ ] **Step 4: 통과 확인**

Run: `pnpm --dir frontend test -- sleep-check`
Expected: PASS. (`tsc`는 Task 3 전까지 호출부 때문에 실패한다. Task 3과 같이 확인한다.)

- [ ] **Step 5: 커밋** — 호출부가 깨진 상태로 커밋하지 않도록 Task 3과 한 커밋으로 묶는다. 이 Task는 커밋하지 않고 Task 3으로 넘긴다.

---

### Task 3: 리포트 화면 (v2 연결, 판단 보류 문구, 신호 약함 카드 숨김)

**Files:**
- Modify: `frontend/src/components/sleep/check-flow.tsx` (리포트로 넘어가는 부분)
- Modify: `frontend/src/components/sleep/report-view.tsx`
- Modify: `frontend/src/components/sleep/report.tsx`
- Modify: `frontend/e2e/check-flow.spec.ts`
- Modify: `frontend/e2e/a11y.spec.ts`

**Interfaces:**
- Consumes: Task 2의 `ReportAnswers`, `toReportHash`, `fromReportHash`, `isTooEarly`, `TOO_EARLY_COPY`
- Produces: `Report` props `{ level: Level; signals: Question[]; tooEarly: boolean; shared: boolean }`

- [ ] **Step 1: e2e 수정**

`check-flow.spec.ts`
- `/\/r#v1-e7$/` → `/\/r#v2-e7-0$/`
- `/\/r#v1-0$/` → `/\/r#v2-0-0$/`
- 아래 테스트 두 개를 추가한다.

```ts
test("주요 신호를 모른다고 답하면 '아직 판단하기 일러요'가 보인다", async ({
  page,
}) => {
  await start(page)
  for (let i = 1; i < TOTAL; i++) await answer(page, "잘 모르겠어요", i + 1)
  await page.getByRole("button", { name: "잘 모르겠어요", exact: true }).click()
  await expect(page).toHaveURL(/\/r#v2-0-[0-9a-z]+$/)
  await expect(
    page.getByRole("heading", { name: "아직 판단하기 일러요" }),
  ).toBeVisible()
  await expect(page.getByText("지금은 걱정 신호가 적어요")).toHaveCount(0)
})

test("신호 약함 리포트에는 위험·치료 이득 카드가 없다", async ({ page }) => {
  await page.goto("/r#v2-0-0")
  await expect(
    page.getByRole("heading", { name: "지금은 걱정 신호가 적어요" }),
  ).toBeVisible()
  await expect(page.getByText("치료하지 않으면")).toHaveCount(0)
  await expect(page.getByText("치료하면", { exact: true })).toHaveCount(0)
  await expect(page.getByText("검사는 이렇게 받아요")).toBeVisible()
})
```

`a11y.spec.ts` 화면 목록: 기존 v1 경로는 호환 확인용으로 두고 아래 두 줄을 추가한다.

```ts
  { name: "s3-weak-v2", path: "/r#v2-0-0" },
  // 주요 신호 3문항(비트 4+8+16=28)을 모름 → 36진수 "s"
  { name: "s3-too-early", path: "/r#v2-0-s" },
```

- [ ] **Step 2: 실패 확인**

Run: `pnpm --dir frontend exec tsc --noEmit`
Expected: FAIL (호출부 시그니처 불일치). e2e는 빌드가 필요해 Step 5에서 돈다.

- [ ] **Step 3: 구현**

`check-flow.tsx` — 리포트로 넘어가는 부분:

```tsx
    const signals = QUESTIONS.filter((q) => next[q.id] === "yes")
    const unknowns = QUESTIONS.filter((q) => next[q.id] === "unknown")
    track({ name: "check_complete", level: judge(signals) })
    router.push(`/r#${toReportHash({ signals, unknowns })}`)
```

`report-view.tsx`:

```tsx
import {
  fromReportHash,
  isTooEarly,
  judge,
  toReportHash,
} from "@/lib/sleep-check"
```

```tsx
  const answers = fromReportHash(hash)
  if (!answers) {
    // (오류 화면 그대로)
  }

  const level = judge(answers.signals)
  const sharePath = `/r?shared=1#${toReportHash(answers)}`
```

```tsx
        <Report
          level={level}
          signals={answers.signals}
          tooEarly={isTooEarly(level, answers.unknowns)}
          shared={shared}
        />
```

`report.tsx`:
- import에 `TOO_EARLY_COPY`를 더한다.
- `Report` props에 `tooEarly: boolean`을 더하고 `const copy = tooEarly ? { ...LEVEL_COPY[level], ...TOO_EARLY_COPY } : LEVEL_COPY[level]`로 바꾼다.
- `<ReportCard title="치료하지 않으면">…</ReportCard>`와 `<ReportCard title="치료하면">…</ReportCard>`를 하나의 `{level !== "weak" && (<>…</>)}`로 감싼다. 주석: `{/* 신호가 적은 사람에게 위험 수치를 보여주면 겁주기로 읽힌다. "자는 동안" 카드와 같은 기준으로 숨긴다. */}`

- [ ] **Step 4: 정적 확인**

Run: `pnpm --dir frontend exec tsc --noEmit && pnpm --dir frontend lint && pnpm --dir frontend test`
Expected: PASS

- [ ] **Step 5: e2e 확인**

Run: `make fe-check` 다음 `pnpm --dir frontend exec playwright test e2e/check-flow.spec.ts e2e/a11y.spec.ts`
Expected: PASS

- [ ] **Step 6: 커밋 (Task 2 포함)**

```bash
git add frontend/src/lib/sleep-check.ts frontend/src/lib/sleep-check.test.ts frontend/src/components/sleep frontend/e2e
git commit -m "feat: keep unsure answers in the report link and stop calling them low risk"
```

---

### Task 4: 병원 카드 주소 링크와 선택 버튼 hover

**Files:**
- Modify: `frontend/src/components/clinics/clinic-card.tsx` (주소 영역)
- Modify: `frontend/src/components/clinics/clinic-finder.tsx` (보기 버튼 2개, `RegionOption`)

**Interfaces:**
- Consumes: `mapSearchUrl(hospital)` (`lib/hospitals.ts`, 변경 없음)

- [ ] **Step 1: 주소를 항상 지도 링크로** — `clinic-card.tsx`의 `{link.target === "map" ? (…) : (<a …>)}` 전체와 그 위 주석을 아래로 바꾼다. import에 `MapPin`을 더한다.

```tsx
        {/* 주소를 누르면 지도에서 위치를 본다. 앞의 핀과 뒤의 외부 링크 아이콘으로 누를 수 있다는 걸 알린다.
            주요 버튼도 지도로 가는 병원은 링크가 겹치지만, 카드마다 주소 모양이 달라지는 것보다 낫다고 정했다. */}
        <a
          href={mapSearchUrl(hospital)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-12 min-w-0 items-center gap-1.5 text-base text-muted-foreground"
        >
          <MapPin className="size-4 shrink-0" aria-hidden />
          <span className="min-w-0 [overflow-wrap:anywhere] underline underline-offset-4">
            {hospital.address}
          </span>
          <ExternalLink className="size-4 shrink-0" aria-hidden />
          <span className="sr-only">지도에서 보기</span>
        </a>
```

- [ ] **Step 2: 선택된 버튼은 hover에도 노란 글자** — `clinic-finder.tsx`의 세 곳에서 `"border-primary text-primary"`를 `"border-primary text-primary hover:text-primary"`로 바꾼다(지역 버튼, 가까운 순 버튼, `RegionOption`). Tailwind v4는 hover를 마우스가 있는 기기에만 걸어서 폰 동작은 그대로다.

- [ ] **Step 3: 정적 확인**

Run: `pnpm --dir frontend exec tsc --noEmit && pnpm --dir frontend lint`
Expected: PASS

- [ ] **Step 4: 화면 확인** — 개발 서버에서 `/clinics` 375px. 레즈메드·홈페이지·지도 병원 카드의 주소가 같은 모양(핀 + 밑줄 + ↗)인지, 두 줄 주소에서 아이콘이 어긋나지 않는지, 데스크탑에서 "가까운 순" 클릭 후 마우스를 올려도 노란 글자인지 본다.

- [ ] **Step 5: 커밋**

```bash
git add frontend/src/components/clinics
git commit -m "feat: show every clinic address as a map link"
```

---

### Task 5: 데이터 재수집

**Files:**
- Modify: `frontend/src/data/hospitals.json` (크롤러 출력)

- [ ] **Step 1: 크롤링** — Run: `make crawl`. Expected: 로그에 `열리지 않아 지운 홈페이지: N곳`(QA 기준 약 16곳)과 이유가 나온다.
- [ ] **Step 2: 확인** — Run: `pnpm --dir frontend test`. Expected: PASS(계약 테스트 포함).
- [ ] **Step 3: 커밋**

```bash
git add frontend/src/data/hospitals.json
git commit -m "chore: recrawl clinics without dead homepages"
```

---

### Task 6: 문서

**Files:**
- Modify: `docs/ux-spec.md`
  - S3 판정 문구 표 아래에 "주요 신호를 모르면 아직 판단하기 일러요" 규칙과 문구
  - 정보 위계 표 3·4행에 "신호 약함에서는 숨긴다"
  - S3' 해시 v2 형식과 v1 읽기
  - S4 "고른 시·도, 주소 가나다순" → "학회 등록 병원 먼저, 그 안에서 주소 가나다순"
  - S4 카드에 "주소는 핀 + 밑줄 + 외부 링크 아이콘, 모든 카드 같은 모양"
- Modify: `docs/tech-stack.md`, `docs/architecture.md` — 해시 형식 v2와 v1 호환 이유
- Modify: `docs/troubleshooting.md` — 죽은 홈페이지 링크(현상, 원인: 심평원·학회 데이터의 오래된 홈페이지, 해결: 크롤 때 접속 확인)

- [ ] **Step 1: 문서 수정**
- [ ] **Step 2: 커밋**

```bash
git add docs
git commit -m "docs: record the QA fixes in the screen spec and architecture"
```

---

## 마무리

- [ ] `make gate` 통과 후 `git push`
- [ ] 검증은 새 세션의 verifier·design-reviewer가 [verification.md](verification.md) 기준으로 한다.
