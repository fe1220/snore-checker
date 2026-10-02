import assert from "node:assert/strict"
import { test } from "node:test"

import { assertNoSharpDrop, carryListed, sortById } from "./guard.ts"
import type { Hospital } from "./merge.ts"

function hospital(id: string, overrides: Partial<Hospital> = {}): Hospital {
  return {
    id,
    name: `${id}의원`,
    region: "서울",
    address: "서울특별시 중구 을지로 1",
    phone: null,
    lat: 37.566,
    lng: 126.978,
    sourceUrl: id.startsWith("hira-") ? null : `https://www.resmed.kr/psg-finder/${id}`,
    homepage: null,
    listed: false,
    kind: "의원",
    ...overrides,
  }
}

// 레즈메드 출처 resmed개, 그중 listed개에 배지, 스냅샷 병원 hira개
function list(resmed: number, listed: number, hira = 0): Hospital[] {
  return [
    ...Array.from({ length: resmed }, (_, i) => hospital(`r${i}`, { listed: i < listed })),
    ...Array.from({ length: hira }, (_, i) => hospital(`hira-${i}`)),
  ]
}

test("이전 저장본이 없으면 비교하지 않는다", () => {
  assert.doesNotThrow(() => assertNoSharpDrop(null, list(1, 0)))
})

test("레즈메드 출처 병원이 20% 넘게 줄면 실패한다", () => {
  assert.doesNotThrow(() => assertNoSharpDrop(list(100, 0), list(80, 0, 20)))
  assert.throws(() => assertNoSharpDrop(list(100, 0), list(79, 0, 21)), /레즈메드 출처 병원이 100곳에서 79곳/)
})

test("학회 목록 병원이 20% 넘게 줄면 실패한다", () => {
  assert.doesNotThrow(() => assertNoSharpDrop(list(100, 10), list(100, 8)))
  assert.throws(() => assertNoSharpDrop(list(100, 10), list(100, 7)), /학회 목록 병원이 10곳에서 7곳/)
})

test("늘어나는 건 막지 않는다", () => {
  assert.doesNotThrow(() => assertNoSharpDrop(list(10, 0), list(300, 73)))
})

test("학회 수집 실패 때 배지를 이어 붙인 뒤의 수치로 판단한다", () => {
  const previous = list(100, 50)
  const next = list(100, 0)
  assert.throws(() => assertNoSharpDrop(previous, next), /학회 목록 병원/)
  assert.doesNotThrow(() => assertNoSharpDrop(previous, carryListed(previous, next)))
})

test("이전 저장본의 배지와 홈페이지를 id로 이어 붙인다", () => {
  const previous = [hospital("a", { listed: true, homepage: "https://a.example" }), hospital("b", { listed: true })]
  const next = [hospital("b"), hospital("a"), hospital("new")]
  assert.deepEqual(
    carryListed(previous, next).map((h) => [h.id, h.listed, h.homepage]),
    [
      ["b", true, null],
      ["a", true, "https://a.example"],
      ["new", false, null],
    ],
  )
})

test("새로 받은 홈페이지가 있으면 이전 값보다 앞선다", () => {
  const previous = [hospital("a", { listed: true, homepage: "https://old.example" })]
  const [carried] = carryListed(previous, [hospital("a", { homepage: "https://new.example" })])
  assert.equal(carried.homepage, "https://new.example")
  assert.equal(carried.listed, true)
})

test("이전에 listed였어도 지금 목록에 없는 병원은 되살리지 않는다", () => {
  const previous = [hospital("gone", { listed: true })]
  assert.deepEqual(carryListed(previous, [hospital("a")]).map((h) => h.id), ["a"])
})

test("id 순으로 정렬하고 원본 배열은 바꾸지 않는다", () => {
  const hospitals = [hospital("seoul"), hospital("hira-b"), hospital("busan"), hospital("hira-a")]
  assert.deepEqual(
    sortById(hospitals).map((h) => h.id),
    ["busan", "hira-a", "hira-b", "seoul"],
  )
  assert.equal(hospitals[0].id, "seoul")
})
