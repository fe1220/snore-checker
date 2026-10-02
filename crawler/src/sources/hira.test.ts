import assert from "node:assert/strict"
import { test } from "node:test"

import { loadSnapshot, parseSnapshot } from "./hira.ts"

const item = {
  ykiho: "JDQ4MTYyMiM1MSMkMiMkNCMkMDAkMzgxOTYxIzQxIyQxIyQ3",
  name: "누가이비인후과의원",
  kind: "의원",
  address: "강원특별자치도 동해시 한섬로 111-7, 3층 (천곡동, 현진빌딩)",
  phone: "033-535-3600",
  homepage: null,
  lat: 37.5222543,
  lng: 129.1152178,
}

function snapshot(...items: unknown[]) {
  return { version: "2026.6", items }
}

test("형식이 맞는 스냅샷을 그대로 돌려준다", () => {
  assert.deepEqual(parseSnapshot(snapshot(item)), { version: "2026.6", items: [item] })
})

test("version이나 items가 없으면 실패한다", () => {
  assert.throws(() => parseSnapshot({ items: [item] }), /version/)
  assert.throws(() => parseSnapshot({ version: "2026.6", items: [] }), /items/)
  assert.throws(() => parseSnapshot(null), /version/)
})

test("필수 필드가 없으면 실패한다", () => {
  for (const field of ["ykiho", "name", "kind", "address"]) {
    assert.throws(() => parseSnapshot(snapshot({ ...item, [field]: "" })), new RegExp(`${field}가 없습니다`))
  }
})

test("전화번호와 홈페이지는 null일 수 있지만 빠질 수는 없다", () => {
  assert.equal(parseSnapshot(snapshot({ ...item, phone: null })).items[0].phone, null)
  const { homepage: _, ...withoutHomepage } = item
  assert.throws(() => parseSnapshot(snapshot(withoutHomepage)), /homepage/)
})

test("좌표가 없거나 한국 범위 밖이면 실패한다", () => {
  assert.throws(() => parseSnapshot(snapshot({ ...item, lat: "37.5" })), /좌표/)
  assert.throws(() => parseSnapshot(snapshot({ ...item, lat: 0, lng: 0 })), /좌표/)
  // 위도와 경도가 뒤바뀐 경우
  assert.throws(() => parseSnapshot(snapshot({ ...item, lat: item.lng, lng: item.lat })), /좌표/)
})

test("ykiho가 겹치면 실패한다", () => {
  assert.throws(() => parseSnapshot(snapshot(item, { ...item, name: "다른의원" })), /겹칩니다/)
})

test("저장소의 스냅샷이 검증을 통과하고 수면다원검사 실시기관 수백 곳을 담고 있다", async () => {
  const { version, items } = await loadSnapshot()
  assert.match(version, /^\d{4}\.\d{1,2}$/)
  assert.ok(items.length >= 600, `${items.length}건`)
})
