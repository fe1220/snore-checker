import assert from "node:assert/strict"
import { test } from "node:test"

import { addressKey, findMatch, isSimilarName, normalizeName, normalizePhone } from "./match.ts"

const target = { name: "숨수면의원", address: "경기도 고양시 일산동구 일산로 46 남정시티프라자 409호 (백석동)", phone: "031-932-7800" }

function place(name: string, address: string, phone: string | null) {
  return { name, address, phone }
}

test("전화번호는 숫자만 남긴다", () => {
  assert.equal(normalizePhone("031-932-7800"), "0319327800")
  assert.equal(normalizePhone(null), "")
})

test("이름에서 괄호, 법인명 접두어, 공백을 지운다", () => {
  assert.equal(normalizeName("의료법인 길의료재단 길병원"), "길병원")
  assert.equal(normalizeName("의료법인명지의료재단명지병원"), "명지병원")
  assert.equal(normalizeName("(의)일맥의료재단 강동더서울의원"), "강동더서울의원")
  assert.equal(normalizeName("학교법인 을지학원 대전을지대학교병원"), "대전을지대학교병원")
  assert.equal(normalizeName("부산성모병원(재단법인 천주교부산교구유지재단)"), "부산성모병원")
  assert.equal(normalizeName("비에스(BS)숨이비인후과의원"), "비에스숨이비인후과의원")
  assert.equal(normalizeName("인제대학교 서울백병원"), "인제대학교서울백병원")
})

test("진료과와 기관 종류만 같은 이름은 비슷하다고 보지 않는다", () => {
  assert.equal(isSimilarName("참이비인후과의원", "제일이비인후과의원"), false)
  assert.equal(isSimilarName("제이에이치박준희이비인후과의원", "기억드림 정신건강의학과의원"), false)
  assert.equal(isSimilarName("의료법인 온그룹의료재단 온종합병원", "의료법인 온그룹의료재단 온요양병원"), false)
})

test("표기만 다른 이름은 비슷하다고 본다", () => {
  assert.equal(isSimilarName("두리이비인후과의원 남동탄점", "남동탄두리이비인후과의원"), true)
  assert.equal(isSimilarName("한림대학교부속 춘천성심병원", "한림대학교춘천성심병원"), true)
  assert.equal(isSimilarName("의료법인 길의료재단 길병원", "길병원"), true)
  assert.equal(isSimilarName("에이치플러스 양지병원", "의료법인서울효천의료재단 에이치플러스양지병원"), true)
})

test("주소 키는 시·군·구, 도로명, 건물번호다", () => {
  assert.equal(addressKey("강원도 동해시 한섬로 111-7"), "동해시 한섬로 111-7")
  assert.equal(addressKey("강원특별자치도 동해시 한섬로 111-7, 3층 (천곡동, 현진빌딩)"), "동해시 한섬로 111-7")
  assert.equal(addressKey("경기도 고양시 덕양구 마상로154번길 68 문덕메디칼빌딩"), "고양시 마상로154번길 68")
  assert.equal(addressKey("경기도 고양시 덕양구 마상로 154번길 68"), "고양시 마상로154번길 68")
  assert.equal(addressKey("강원특별자치도 원주시 일산로 20-0,  (일산동)"), "원주시 일산로 20")
  assert.equal(addressKey("경기도 남양주시 퇴계원읍 퇴계원로 20 지하2~지상7층"), "남양주시 퇴계원로 20")
  assert.equal(addressKey("세종특별자치시 보듬7로 20 세종충남대학교병원 (도담동)"), "세종특별자치시 보듬7로 20")
  assert.equal(addressKey("전남광주통합특별시 동구 필문대로 365,  (학동)"), "동구 필문대로 365")
})

test("도로명 주소가 아니면 주소 키가 없다", () => {
  assert.equal(addressKey("대한민국 충청북도 충주시 칠금동 867"), null)
})

test("전화번호와 이름이 같으면 주소가 달라도 맞춘다", () => {
  const moved = place("숨수면의원", "경기도 고양시 일산동구 중앙로 1000, 3층", "031-932-7800")
  assert.equal(findMatch(target, [moved]), moved)
})

test("전화번호와 주소가 같으면 이름이 달라도 맞춘다", () => {
  const renamed = place("백석코아이비인후과의원", "경기도 고양시 일산동구 일산로 46, 409호", "031-932-7800")
  assert.equal(findMatch(target, [renamed]), renamed)
})

test("전화번호가 달라도 주소와 이름이 같으면 맞춘다", () => {
  const newPhone = place("숨수면의원", "경기도 고양시 일산동구 일산로 46, 남정시티프라자 409호", "932-7800")
  assert.equal(findMatch(target, [newPhone]), newPhone)
  assert.equal(findMatch({ ...target, phone: null }, [newPhone]), newPhone)
})

test("전화번호만 같고 이름과 주소가 다르면 맞추지 않는다", () => {
  const other = place("기억드림 정신건강의학과의원", "경기도 고양시 일산동구 중앙로 1000", "031-932-7800")
  assert.equal(findMatch(target, [other]), null)
})

test("이름만 같으면 맞추지 않는다", () => {
  const sameName = place("숨수면의원", "서울특별시 강남구 논현로 648", "02-548-3369")
  assert.equal(findMatch(target, [sameName]), null)
})

test("주소만 같고 이름이 다르면 맞추지 않는다", () => {
  const neighbor = place("서울강민신경과의원", "경기도 고양시 일산동구 일산로 46, 501호", "031-111-2222")
  assert.equal(findMatch(target, [neighbor]), null)
})

test("도로명과 건물번호가 같아도 시·군·구가 다르면 주소가 같다고 보지 않는다", () => {
  const otherCity = place("숨수면의원", "경기도 파주시 일산로 46", "031-111-2222")
  assert.equal(findMatch(target, [otherCity]), null)
})

test("같은 조건의 후보가 둘이면 맞추지 않는다", () => {
  const a = place("숨수면의원", "경기도 고양시 일산동구 일산로 46, 409호", "031-111-2222")
  const b = place("숨수면의원", "경기도 고양시 일산동구 일산로 46, 410호", "031-333-4444")
  assert.equal(findMatch(target, [a, b]), null)
})

test("전화번호와 주소가 모두 같은 후보가 하나면 같은 건물의 다른 후보가 있어도 그 후보로 맞춘다", () => {
  const exact = place("숨수면의원", "경기도 고양시 일산동구 일산로 46, 409호", "031-932-7800")
  const neighbor = place("숨수면의원", "경기도 고양시 일산동구 일산로 46, 501호", "031-111-2222")
  assert.equal(findMatch(target, [neighbor, exact]), exact)
})
