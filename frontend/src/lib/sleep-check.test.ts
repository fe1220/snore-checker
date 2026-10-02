import { describe, expect, it } from "vitest"

import { decodeSignals, encodeSignals, judge, QUESTIONS } from "./sleep-check"

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

describe("encodeSignals / decodeSignals", () => {
  it("코드에 문항 id 같은 읽을 수 있는 단어가 없다", () => {
    const code = encodeSignals(pick(["apnea", "pressure", "body"]))
    expect(code).toMatch(/^[0-9a-z]{1,2}$/)
  })

  it("인코딩한 코드를 디코딩하면 같은 문항이 나온다", () => {
    for (const ids of [
      [],
      ["apnea"],
      ["snore-often", "age", "body"],
      QUESTIONS.map((q) => q.id),
    ]) {
      expect(decodeSignals(encodeSignals(pick(ids)))).toEqual(pick(ids))
    }
  })

  it("신호가 없으면 0", () => {
    expect(encodeSignals([])).toBe("0")
    expect(decodeSignals("0")).toEqual([])
  })

  it("잘못된 코드는 null", () => {
    for (const code of ["", "zz", "abc", "A1", "-1", "apnea"]) {
      expect(decodeSignals(code)).toBeNull()
    }
  })
})
