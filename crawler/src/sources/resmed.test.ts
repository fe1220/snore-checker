import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { test } from "node:test"

import { parse, withAreaCode } from "./resmed.ts"

const fixture = await readFile(new URL("../../fixtures/resmed.html", import.meta.url), "utf8")

test("병원 필드를 읽고 시·도를 약칭으로, 주소에서 우편번호를 뺀다", () => {
  assert.deepEqual(parse(fixture)[0], {
    id: "gangwonnugaent",
    name: "누가이비인후과의원",
    region: "강원",
    address: "강원도 동해시 한섬로 111-7",
    phone: "033-535-3600",
    lat: 37.52221,
    lng: 129.11555,
    sourceUrl: "https://www.resmed.kr/psg-finder/gangwonnugaent",
  })
})

test("전화번호가 비어 있으면 null이다", () => {
  const hospital = parse(fixture).find((h) => h.id === "seoulcheongdament")
  assert.equal(hospital?.phone, null)
  assert.equal(hospital?.address, "서울특별시 강남구 학동로53길 3-2 2층 (논현동)")
})

test("필수 값이 없는 병원과 끝의 템플릿은 건너뛴다", () => {
  assert.deepEqual(
    parse(fixture).map((h) => h.id),
    ["gangwonnugaent", "seoulcheongdament"],
  )
})

test("HTML 엔티티를 풀어 쓴다", () => {
  const html = fixture.replace("누가이비인후과의원</div>", "숨&amp;잠의원</div>")
  assert.equal(parse(html)[0].name, "숨&잠의원")
})

test("알 수 없는 시·도가 나오면 실패한다", () => {
  const html = fixture.replace('"강원도"', '"평양"')
  assert.throws(() => parse(html), /알 수 없는 시·도/)
})

test("지역번호가 없는 지역 번호에만 시·도 지역번호를 붙인다", () => {
  assert.equal(withAreaCode("981-7979", "경기"), "031-981-7979")
  assert.equal(withAreaCode("2699-1442", "서울"), "02-2699-1442")
  assert.equal(withAreaCode("1577-0083", "서울"), "1577-0083")
  assert.equal(withAreaCode("033-535-3600", "강원"), "033-535-3600")
  assert.equal(withAreaCode("02-722-7977", "서울"), "02-722-7977")
  assert.equal(withAreaCode("0507-1481-3304", "서울"), "0507-1481-3304")
})

test("parse가 지역번호 없는 전화번호에 지역번호를 붙인다", () => {
  const html = fixture.replace("033-535-3600", "535-3600")
  assert.equal(parse(html)[0].phone, "033-535-3600")
})
