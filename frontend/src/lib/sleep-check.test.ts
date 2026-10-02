import { describe, expect, it } from "vitest"

import { judge, parseSignals, QUESTIONS } from "./sleep-check"

function pick(ids: string[]) {
  return QUESTIONS.filter((q) => ids.includes(q.id))
}

describe("judge", () => {
  it("강한 신호가 하나라도 있으면 strong", () => {
    for (const q of QUESTIONS.filter((q) => q.strong)) {
      expect(judge([q])).toBe("strong")
    }
  })

  it("강한 신호 없이 3개 이상이면 moderate", () => {
    expect(judge(pick(["snore-often", "snore-loud", "age"]))).toBe("moderate")
  })

  it("강한 신호 없이 2개 이하면 weak", () => {
    expect(judge(pick(["snore-often", "age"]))).toBe("weak")
    expect(judge([])).toBe("weak")
  })
})

describe("parseSignals", () => {
  it("문항 id 목록을 문항으로 바꾼다", () => {
    expect(parseSignals("apnea,age").map((q) => q.id)).toEqual(["apnea", "age"])
  })

  it("모르는 id와 빈 값은 버린다", () => {
    expect(parseSignals("apnea,unknown-id,")).toEqual(pick(["apnea"]))
    expect(parseSignals("")).toEqual([])
  })
})
