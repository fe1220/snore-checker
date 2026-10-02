import { expect, test, type Page } from "@playwright/test"

const TOTAL = 9

// 분석 키 없이 빌드해도 track()이 부르는 window.gtag를 가로채 이벤트를 센다.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const events: unknown[][] = []
    Object.assign(window, {
      __events: events,
      gtag: (...args: unknown[]) => events.push(args),
    })
  })
})

function events(page: Page, name: string) {
  return page.evaluate(
    (n) =>
      (window as unknown as { __events: unknown[][] }).__events.filter(
        (e) => e[0] === "event" && e[1] === n,
      ).length,
    name,
  )
}

function step(page: Page, n: number) {
  return expect(page.getByText(`${n} / ${TOTAL} ·`)).toBeVisible()
}

async function answer(page: Page, label: string, next: number) {
  await page.getByRole("button", { name: label, exact: true }).click()
  await step(page, next)
}

async function start(page: Page) {
  await page.goto("/check")
  await page.waitForLoadState("networkidle")
  await step(page, 1)
}

test("9문항을 모두 답하면 리포트 단계가 보인다", async ({ page }) => {
  await start(page)
  for (let i = 1; i < TOTAL; i++) await answer(page, "네", i + 1)
  await page.getByRole("button", { name: "네", exact: true }).click()
  await expect(page).toHaveURL(/\/r#v1-e7$/)
  await expect(page.getByLabel(/^3단계 중 3단계/)).toBeVisible()
})

test("3번째 질문에서 뒤로 가기를 누르면 2번째 질문으로 돌아간다", async ({
  page,
}) => {
  await start(page)
  await answer(page, "아니요", 2)
  const second = await page.getByRole("heading", { level: 1 }).innerText()
  await answer(page, "아니요", 3)
  await page.goBack()
  await step(page, 2)
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(second)
  await expect(page).toHaveURL(/\/check$/)
})

test("3번째 질문에서 '이전 질문'을 누르면 2번째 질문으로 돌아간다", async ({
  page,
}) => {
  await start(page)
  await answer(page, "아니요", 2)
  const second = await page.getByRole("heading", { level: 1 }).innerText()
  await answer(page, "아니요", 3)
  await page.getByRole("button", { name: "이전 질문으로 가기" }).click()
  await step(page, 2)
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(second)
})

test("답을 누른 직후 '이전 질문'을 누르면 앞으로 넘어가지 않는다", async ({
  page,
}) => {
  await start(page)
  await answer(page, "아니요", 2)
  await page.getByRole("button", { name: "아니요", exact: true }).click()
  await page.getByRole("button", { name: "이전 질문으로 가기" }).click()
  await step(page, 1)
  // 답을 보여주는 0.2초가 지나도 그대로여야 한다.
  await page.waitForTimeout(500)
  await step(page, 1)
})

test("마지막 문항을 빠르게 두 번 눌러도 리포트로 한 번만 간다", async ({
  page,
}) => {
  await start(page)
  for (let i = 1; i < TOTAL; i++) await answer(page, "아니요", i + 1)
  const reports: string[] = []
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame() && new URL(frame.url()).pathname === "/r")
      reports.push(frame.url())
  })
  await page.getByRole("button", { name: "아니요", exact: true }).dblclick()
  await expect(page).toHaveURL(/\/r#v1-0$/)
  await page.waitForTimeout(500)
  expect(reports).toHaveLength(1)
  expect(await events(page, "check_complete")).toBe(1)
  expect(await events(page, "check_start")).toBe(1)
})

test("질문이 바뀌면 초점이 질문 제목으로 간다", async ({ page }) => {
  await start(page)
  for (const [label, next] of [
    ["아니요", 2],
    ["네", 3],
  ] as const) {
    await answer(page, label, next)
    await expect(page.getByRole("heading", { level: 1 })).toBeFocused()
  }
  await page.goBack()
  await step(page, 2)
  await expect(page.getByRole("heading", { level: 1 })).toBeFocused()
})
