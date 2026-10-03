import { describe, expect, it } from "vitest"

import {
  fromReportHash,
  isTooEarly,
  judge,
  QUESTIONS,
  STRONG_QUESTIONS,
  toReportHash,
} from "./sleep-check"

function pick(ids: string[]) {
  return QUESTIONS.filter((q) => ids.includes(q.id))
}

describe("judge", () => {
  it("강한 신호가 하나라도 있으면 strong", () => {
    for (const q of QUESTIONS.filter((q) => q.strong)) {
      expect(judge([q])).toBe("strong")
    }
  })

  it("주요 신호는 판단 기준 문구에 쓸 짧은 이름이 있다", () => {
    expect(STRONG_QUESTIONS.length).toBeGreaterThan(0)
    for (const q of STRONG_QUESTIONS) expect(q.short).toBeTruthy()
  })

  it("강한 신호 없이 3개 이상이면 moderate", () => {
    expect(judge(pick(["snore-often", "snore-loud", "age"]))).toBe("moderate")
  })

  it("강한 신호 없이 2개 이하면 weak", () => {
    expect(judge(pick(["snore-often", "age"]))).toBe("weak")
    expect(judge([])).toBe("weak")
  })
})

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
      [
        ["snore-often", "age"],
        ["apnea", "body"],
      ],
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
