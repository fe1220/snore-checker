import assert from "node:assert/strict"
import { test } from "node:test"

import { assertValid, distanceKm, merge, regionOf } from "./merge.ts"
import type { HiraItem } from "./sources/hira.ts"
import type { Hospital } from "./sources/resmed.ts"

const resmed: Hospital = {
  id: "gyeonggibomboment",
  name: "봄봄이비인후과의원",
  region: "경기",
  address: "경기도 고양시 덕양구 권율대로 672 봄오피스텔 3층 (원흥동)",
  phone: "031-966-0300",
  lat: 37.287,
  lng: 127.05798,
  sourceUrl: "https://www.resmed.kr/psg-finder/gyeonggibomboment",
}

const hira: HiraItem = {
  ykiho: "A",
  name: "봄봄이비인후과의원",
  kind: "의원",
  address: "경기도 고양시 덕양구 권율대로 672, 봄오피스텔 3층 (원흥동)",
  phone: "031-966-0300",
  homepage: "http://bombom.example",
  lat: 37.6498655,
  lng: 126.8741742,
}

test("맞춘 병원은 좌표만 스냅샷 값으로 바꾸고 나머지는 레즈메드 값을 쓴다", () => {
  const result = merge([resmed], [hira])
  assert.deepEqual(result.hospitals, [{ ...resmed, lat: 37.6498655, lng: 126.8741742 }])
  assert.equal(result.matched.length, 1)
  assert.equal(result.matched[0].hospital.id, "gyeonggibomboment")
  assert.ok(Math.abs(result.matched[0].movedKm - 43.5) < 0.5, `${result.matched[0].movedKm}km`)
  assert.deepEqual(result.unmatched, [])
})

test("이름이 40자를 넘으면 스냅샷 이름을 쓴다", () => {
  const long = { ...resmed, name: "코엔이비인후과의원".repeat(5) }
  assert.equal(merge([long], [hira]).hospitals[0].name, "봄봄이비인후과의원")
})

test("이름이 40자 이하면 스냅샷 이름과 달라도 레즈메드 이름을 쓴다", () => {
  const renamed = { ...hira, name: "원흥봄봄이비인후과의원" }
  assert.equal(merge([resmed], [renamed]).hospitals[0].name, "봄봄이비인후과의원")
})

test("못 맞춘 병원은 좌표와 이름을 그대로 둔다", () => {
  const other = { ...hira, name: "다른의원", address: "서울특별시 중구 을지로 1", phone: "02-000-0000" }
  const result = merge([resmed], [other])
  assert.deepEqual(result.hospitals, [resmed])
  assert.deepEqual(result.unmatched, [resmed])
  assert.deepEqual(result.matched, [])
})

test("스냅샷에만 있는 병원은 추가하지 않는다", () => {
  const extra = { ...hira, ykiho: "B", name: "다른의원", address: "서울특별시 중구 을지로 1", phone: "02-000-0000" }
  assert.equal(merge([resmed], [hira, extra]).hospitals.length, 1)
})

test("시·도는 원본 값이 아니라 주소 첫 단어로 다시 계산한다", () => {
  const wrong = { ...resmed, region: "경북" as const, address: "경상남도 통영시 무전대로 41 201~401호 (무전동)" }
  assert.equal(merge([wrong], []).hospitals[0].region, "경남")
})

test("시·도 표기가 달라도 약칭으로 통일한다", () => {
  assert.equal(regionOf("강원도 동해시 한섬로 111-7"), "강원")
  assert.equal(regionOf("강원특별자치도 동해시 한섬로 111-7"), "강원")
  assert.equal(regionOf("전라북도 전주시 덕진구 건지로 20"), "전북")
  assert.equal(regionOf("전북특별자치도 전주시 덕진구 건지로 20"), "전북")
  assert.equal(regionOf("경기도 고양시 덕양구 권율대로 672"), "경기")
  assert.equal(regionOf("서울 강남구 논현로 648"), "서울")
  assert.equal(regionOf("서울특별시 강남구 논현로 648"), "서울")
  assert.equal(regionOf("세종특별자치시 보듬7로 20"), "세종")
  assert.equal(regionOf("제주특별자치도 제주시 동광로 124"), "제주")
  assert.equal(regionOf("대한민국 충청북도 충주시 칠금동 867"), "충북")
})

test("전남광주통합특별시는 구 이름이 광주의 구면 광주, 아니면 전남이다", () => {
  for (const district of ["동구", "서구", "남구", "북구", "광산구"]) {
    assert.equal(regionOf(`전남광주통합특별시 ${district} 필문대로 365`), "광주")
  }
  assert.equal(regionOf("전남광주통합특별시 순천시 이수로 305"), "전남")
  assert.equal(regionOf("전남광주통합특별시 목포시 영산로 1"), "전남")
})

test("모르는 시·도가 나오면 실패한다", () => {
  assert.throws(() => regionOf("평양직할시 중구역 승리거리 1"), /알 수 없는 시·도/)
  assert.throws(() => merge([{ ...resmed, address: "평양 중구역 승리거리 1" }], [hira]), /알 수 없는 시·도/)
})

test("두 좌표 사이의 직선거리를 km로 잰다", () => {
  // 서울시청 → 부산시청
  const km = distanceKm({ lat: 37.5663, lng: 126.9779 }, { lat: 35.1798, lng: 129.075 })
  assert.ok(Math.abs(km - 325) < 5, `${km}km`)
  assert.equal(distanceKm(resmed, resmed), 0)
})

test("저장 전 검증: 형식이 맞으면 통과한다", () => {
  const other = { ...resmed, id: "other", phone: null, sourceUrl: "https://www.resmed.kr/psg-finder/other" }
  assert.doesNotThrow(() => assertValid([resmed, other]))
})

test("저장 전 검증: 필수 값이 비었거나 좌표가 한국 밖이거나 id가 겹치면 실패한다", () => {
  assert.throws(() => assertValid([{ ...resmed, name: " " }]), /name/)
  assert.throws(() => assertValid([{ ...resmed, address: "" }]), /address/)
  assert.throws(() => assertValid([{ ...resmed, sourceUrl: "" }]), /sourceUrl/)
  assert.throws(() => assertValid([{ ...resmed, sourceUrl: "https://example.com/x" }]), /sourceUrl/)
  assert.throws(() => assertValid([{ ...resmed, lat: 0 }]), /좌표/)
  assert.throws(() => assertValid([resmed, resmed]), /겹칩니다/)
})
