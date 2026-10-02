import assert from "node:assert/strict"
import { test } from "node:test"

import { assertValid, distanceKm, type Hospital, merge, normalizeHomepage, regionOf } from "./merge.ts"
import type { HiraItem } from "./sources/hira.ts"
import type { ResmedHospital } from "./sources/resmed.ts"

const resmed: ResmedHospital = {
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

// 스냅샷에만 있는 병원. 레즈메드 병원과 전화·주소·이름이 모두 다르다.
const extra: HiraItem = {
  ykiho: "B",
  name: "숨편한의원",
  kind: "의원",
  address: "서울특별시 중구 을지로 1, 2층 (을지로동)",
  phone: "02-000-0000",
  homepage: null,
  lat: 37.566,
  lng: 126.978,
}

const saved: Hospital = { ...resmed, lat: 37.6498655, lng: 126.8741742, homepage: "http://bombom.example" }

test("맞춘 병원은 좌표와 홈페이지만 스냅샷 값으로 바꾸고 나머지는 레즈메드 값을 쓴다", () => {
  const result = merge([resmed], [hira])
  assert.deepEqual(result.hospitals, [saved])
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

test("못 맞춘 레즈메드 병원은 좌표와 이름을 그대로 두고 홈페이지는 비운다", () => {
  const result = merge([resmed], [extra])
  const kept = { ...resmed, homepage: null }
  assert.deepEqual(result.hospitals[0], kept)
  assert.deepEqual(result.unmatched, [kept])
  assert.deepEqual(result.matched, [])
})

test("스냅샷에만 있는 병원은 스냅샷 값으로 추가하고 원 페이지 링크는 비운다", () => {
  const result = merge([resmed], [hira, { ...extra, homepage: "www.soom.kr/" }])
  assert.equal(result.hospitals.length, 2)
  assert.deepEqual(result.added, [
    {
      id: "hira-df7e70e502",
      name: "숨편한의원",
      region: "서울",
      address: "서울특별시 중구 을지로 1, 2층 (을지로동)",
      phone: "02-000-0000",
      lat: 37.566,
      lng: 126.978,
      sourceUrl: null,
      homepage: "https://www.soom.kr/",
    },
  ])
  assert.deepEqual(result.hospitals[1], result.added[0])
})

test("스냅샷에만 있는 병원의 지역번호 없는 번호에는 시·도 지역번호를 붙인다", () => {
  const busan = { ...extra, address: "부산광역시 수영구 수영로 493", phone: "990-6114" }
  const [added] = merge([], [busan]).added
  assert.equal(added.phone, "051-990-6114")
  assert.equal(added.region, "부산")
  assert.equal(merge([], [{ ...extra, phone: "1588-0223" }]).added[0].phone, "1588-0223")
  assert.equal(merge([], [{ ...extra, phone: null }]).added[0].phone, null)
})

test("의원·병원·종합병원·상급종합이 아닌 기관은 스냅샷에만 있으면 추가하지 않는다", () => {
  const dental = { ...extra, kind: "치과병원" }
  const mental = { ...extra, ykiho: "C", name: "마음정신병원", kind: "정신병원", address: "서울특별시 종로구 종로 1", phone: "02-111-1111" }
  const result = merge([], [dental, mental])
  assert.deepEqual(result.added, [])
  assert.deepEqual(result.skippedKind, [dental, mental])

  for (const kind of ["의원", "병원", "종합병원", "상급종합"]) {
    assert.equal(merge([], [{ ...extra, kind }]).added.length, 1, kind)
  }
})

test("레즈메드에 있는 병원은 기관 종류와 상관없이 그대로 둔다", () => {
  const result = merge([resmed], [{ ...hira, kind: "치과병원" }])
  assert.deepEqual(result.hospitals, [saved])
  assert.deepEqual(result.skippedKind, [])
})

test("못 맞춘 레즈메드 병원과 전화번호가 같은 스냅샷 병원은 같을 수 있어 추가하지 않는다", () => {
  const on = { ...resmed, id: "busanon", name: "온종합병원", address: "부산광역시 부산진구 가야대로 721 (당감동)", phone: "051-607-0114", sourceUrl: "https://www.resmed.kr/psg-finder/busanon" }
  const snapshotOn = { ...extra, name: "온병원", address: "부산광역시 부산진구 가야대로 721, (당감동)", phone: "607-0114" }
  const result = merge([on], [snapshotOn])
  assert.equal(result.hospitals.length, 1)
  assert.deepEqual(result.added, [])
  assert.equal(result.possibleDuplicates.length, 1)
  assert.equal(result.possibleDuplicates[0].hospital.id, "busanon")
  assert.equal(result.possibleDuplicates[0].item, snapshotOn)
})

test("전화번호가 같아도 시·군·구가 다르면 다른 병원으로 보고 추가한다", () => {
  const jh = { ...resmed, id: "gwangjujh", name: "제이에이치박준희이비인후과의원", address: "광주광역시 남구 서문대로 671 2~3층 (진월동)", phone: "062-229-8275", sourceUrl: "https://www.resmed.kr/psg-finder/gwangjujh" }
  const memory = { ...extra, name: "기억드림 정신건강의학과의원", address: "전남광주통합특별시 동구 제봉로 187, 자람빌딩 201호 (대인동)", phone: "062-229-8275" }
  const result = merge([jh], [memory])
  assert.equal(result.added.length, 1)
  assert.deepEqual(result.possibleDuplicates, [])
})

test("못 맞춘 레즈메드 병원과 시·군·구가 같고 이름 한쪽이 다른 쪽을 품으면 추가하지 않는다", () => {
  const fresh = { ...resmed, id: "gimhaefresh", name: "상쾌한이비인후과", address: "경남 김해시 김해대로 2232 3층", phone: "055-338-0000", sourceUrl: "https://www.resmed.kr/psg-finder/gimhaefresh" }
  const snapshotFresh = { ...extra, name: "인제상쾌한이비인후과", address: "경상남도 김해시 활천로 100", phone: "055-333-1111" }
  const result = merge([fresh], [snapshotFresh])
  assert.deepEqual(result.added, [])
  assert.equal(result.possibleDuplicates.length, 1)

  // 이름은 품지만 시·군·구가 다르면 다른 병원으로 본다
  const elsewhere = { ...snapshotFresh, address: "경상남도 창원시 의창구 원이대로 1" }
  assert.equal(merge([fresh], [elsewhere]).added.length, 1)
})

test("진료과·기관 종류·'종합'을 지운 이름끼리 품어도 같을 수 있음으로 본다", () => {
  const on = { ...resmed, id: "busanon", name: "의료법인 온그룹의료재단 온종합병원", address: "부산광역시 부산진구 가야대로 721 719, 767 (당감동)", phone: "051-607-0133", sourceUrl: "https://www.resmed.kr/psg-finder/busanon" }
  const snapshotOn = { ...extra, name: "의료법인 온그룹의료재단 온병원", kind: "종합병원", address: "부산광역시 부산진구 가야대로 719, ,767,721 (당감동)", phone: "051-607-0114" }
  assert.deepEqual(merge([on], [snapshotOn]).added, [])

  const other = { ...snapshotOn, name: "부산참이비인후과의원" }
  assert.equal(merge([on], [other]).added.length, 1)
})

test("맞춘 레즈메드 병원과는 같을 수 있음을 따지지 않는다", () => {
  const samePhone = { ...extra, phone: "031-966-0300" }
  const result = merge([resmed], [hira, samePhone])
  assert.equal(result.added.length, 1)
  assert.deepEqual(result.possibleDuplicates, [])
})

test("홈페이지는 스킴이 없으면 https://를 붙이고, 주소 형식이 아니면 비운다", () => {
  assert.equal(normalizeHomepage("http://www.drbs.or.kr"), "http://www.drbs.or.kr")
  assert.equal(normalizeHomepage("https://sumplus.co.kr/"), "https://sumplus.co.kr/")
  assert.equal(normalizeHomepage("www.busansnail.co.kr"), "https://www.busansnail.co.kr")
  assert.equal(normalizeHomepage(" bundang.chamc.co.kr "), "https://bundang.chamc.co.kr")
  assert.equal(normalizeHomepage("www.코골이이비인후과.kr/"), "https://www.코골이이비인후과.kr/")
  assert.equal(normalizeHomepage(null), null)
  assert.equal(normalizeHomepage(""), null)
  assert.equal(normalizeHomepage("없음"), null)
  assert.equal(normalizeHomepage("http://"), null)
  assert.equal(normalizeHomepage("http://localhost"), null)
  assert.equal(normalizeHomepage("www.a b.kr"), null)
  assert.equal(normalizeHomepage("javascript:alert(1)"), null)
  assert.equal(normalizeHomepage("ftp://files.example.kr"), null)
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
  assert.throws(() => merge([], [{ ...extra, address: "평양 중구역 승리거리 1" }]), /알 수 없는 시·도/)
})

test("두 좌표 사이의 직선거리를 km로 잰다", () => {
  // 서울시청 → 부산시청
  const km = distanceKm({ lat: 37.5663, lng: 126.9779 }, { lat: 35.1798, lng: 129.075 })
  assert.ok(Math.abs(km - 325) < 5, `${km}km`)
  assert.equal(distanceKm(resmed, resmed), 0)
})

const added: Hospital = { ...saved, id: "hira-df7e70e502", sourceUrl: null, homepage: null }

test("저장 전 검증: 형식이 맞으면 통과한다", () => {
  const other = { ...saved, id: "other", phone: null, homepage: null, sourceUrl: "https://www.resmed.kr/psg-finder/other" }
  assert.doesNotThrow(() => assertValid([saved, other, added]))
})

test("저장 전 검증: 필수 값이 비었거나 좌표가 한국 밖이거나 id가 겹치면 실패한다", () => {
  assert.throws(() => assertValid([{ ...saved, name: " " }]), /name/)
  assert.throws(() => assertValid([{ ...saved, address: "" }]), /address/)
  assert.throws(() => assertValid([{ ...saved, lat: 0 }]), /좌표/)
  assert.throws(() => assertValid([saved, saved]), /겹칩니다/)
})

test("저장 전 검증: 원 페이지 링크는 레즈메드 주소이거나, 공공 데이터에만 있는 병원이면 비어 있어야 한다", () => {
  assert.throws(() => assertValid([{ ...saved, sourceUrl: "" }]), /sourceUrl/)
  assert.throws(() => assertValid([{ ...saved, sourceUrl: "https://example.com/x" }]), /sourceUrl/)
  assert.throws(() => assertValid([{ ...saved, sourceUrl: null }]), /sourceUrl/)
  assert.throws(() => assertValid([{ ...added, sourceUrl: "https://www.resmed.kr/psg-finder/hira-df7e70e502" }]), /sourceUrl/)
})

test("저장 전 검증: 홈페이지는 비어 있거나 http(s) 주소여야 한다", () => {
  assert.doesNotThrow(() => assertValid([{ ...added, homepage: "https://www.soom.kr/" }]))
  assert.throws(() => assertValid([{ ...added, homepage: "www.soom.kr" }]), /homepage/)
  assert.throws(() => assertValid([{ ...added, homepage: "" }]), /homepage/)
})
