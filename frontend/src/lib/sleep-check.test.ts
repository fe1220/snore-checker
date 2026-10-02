import { describe, expect, it } from "vitest"

import { fromReportHash, judge, QUESTIONS, toReportHash } from "./sleep-check"

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

describe("toReportHash / fromReportHash", () => {
  it("해시에 문항 id 같은 읽을 수 있는 단어가 없다", () => {
    const hash = toReportHash(pick(["apnea", "pressure", "body"]))
    expect(hash).toMatch(/^v1-[0-9a-z]{1,2}$/)
  })

  it("만든 해시를 읽으면 같은 문항이 나온다", () => {
    for (const ids of [
      [],
      ["apnea"],
      ["snore-often", "age", "body"],
      QUESTIONS.map((q) => q.id),
    ]) {
      expect(fromReportHash(toReportHash(pick(ids)))).toEqual(pick(ids))
    }
  })

  it("앞의 #은 있어도 없어도 읽는다", () => {
    expect(fromReportHash("#v1-0")).toEqual([])
    expect(fromReportHash("v1-0")).toEqual([])
  })

  it("버전이 다르거나 잘못된 해시는 null", () => {
    for (const hash of [
      "",
      "#",
      "0",
      "v2-0",
      "v1-",
      "v1-zz",
      "v1-abc",
      "v1-A1",
      "dh",
    ]) {
      expect(fromReportHash(hash)).toBeNull()
    }
  })
})
