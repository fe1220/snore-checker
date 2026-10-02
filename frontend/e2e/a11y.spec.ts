import AxeBuilder from "@axe-core/playwright"
import { expect, test, type Page } from "@playwright/test"

// 리포트 해시: 문항 9개 전부(e7), 약한 신호 3개(3n), 신호 없음(0). lib/sleep-check.ts의 비트 순서를 따른다.
const SCREENS: {
  name: string
  path: string
  open?: string
  answer?: string
}[] = [
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
  // 전환 효과가 끝난 뒤에 잰다. 도중에 재면 크기가 조금 작게 나온다.
  await page.evaluate(() =>
    Promise.all(document.getAnimations().map((a) => a.finished)),
  )
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
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
    )
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
// 시트가 열려 있으면 뒤에 가려진 화면은 누를 수 없으니 시트 안만 잰다.
function targets(page: Page) {
  return page.evaluate(() =>
    [
      ...(
        document.querySelector<HTMLElement>("[role='dialog']") ?? document
      ).querySelectorAll<HTMLElement>("a[href], button, [role='button']"),
    ]
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
          label: (el.getAttribute("aria-label") ?? el.innerText)
            .trim()
            .slice(0, 30),
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
            path: `../docs/05-verification/a11y/${screen.name}-${width}-${scale * 100}.png`,
            fullPage: !screen.name.startsWith("s4"),
          })
        })
      }
    }
  }
})
