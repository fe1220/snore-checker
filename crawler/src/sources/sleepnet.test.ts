import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { test } from "node:test"

import { collectPages, MAX_PAGES, parse, type SleepnetClinic } from "./sleepnet.ts"

const fixture = await readFile(new URL("../../fixtures/sleepnet.html", import.meta.url), "utf8")

test("openView 안의 JSON에서 이름, 주소, 전화, 홈페이지를 읽는다", () => {
  assert.deepEqual(parse(fixture)[0], {
    name: "Do두신경과의원",
    address: "경남 통영시 무전대로 41 1층, 2층, 3층, 4층",
    phone: "055-725-7979",
    homepage: "http://www.doneuro.co.kr",
  })
})

test("목록의 병원을 순서대로 모두 읽는다", () => {
  assert.deepEqual(
    parse(fixture).map((c) => c.name),
    ["Do두신경과의원", "가톨릭대학교 대전성모병원", "가톨릭대학교 서울성모병원", "건양대학교병원", "보라매병원"],
  )
})

test("이름 끝 공백을 지우고, 스킴 없는 홈페이지에 https://를 붙이고, HTML 엔티티를 푼다", () => {
  const [, daejeon, seoul, konyang] = parse(fixture)
  assert.equal(seoul.name, "가톨릭대학교 서울성모병원")
  assert.equal(seoul.homepage, "https://www.cmcseoul.or.kr")
  assert.equal(daejeon.homepage, "http://www.cmcdj.or.kr")
  assert.equal(konyang.homepage, "https://www.kyuh.ac.kr/prog/doctor/homepage.do?deptCd=NEU&doctorId=002217")
})

test("상세 주소가 비었거나 글자 없는 값(-, 전화번호)이면 주소에 붙이지 않는다", () => {
  const [, daejeon, seoul, konyang] = parse(fixture)
  assert.equal(daejeon.address, "대전광역시 중구 대흥로 64")
  assert.equal(seoul.address, "서울 서초구 반포대로 222 (반포동, 가톨릭대학교서울성모병원)")
  assert.equal(konyang.address, "대전 서구 관저동로 158")
})

test("전화번호의 끝 붙임표와 대표번호 앞 지역번호를 지우고, 숫자가 없으면 null이다", () => {
  const [, daejeon, seoul, , boramae] = parse(fixture)
  assert.equal(daejeon.phone, "1577-0888")
  assert.equal(seoul.phone, "1588-1511")
  assert.equal(boramae.phone, null)
})

test("이름이나 주소가 없는 병원은 건너뛴다", () => {
  const html = fixture.replace("&quot;name&quot;:&quot;Do\\ub450", "&quot;name&quot;:&quot; &quot;,&quot;x&quot;:&quot;")
  assert.equal(parse(html).length, 4)
})

test("openView가 없으면 빈 목록이다", () => {
  assert.deepEqual(parse("<html></html>"), [])
})

// 쪽마다 병원 수를 정해 둔 가짜 목록. 범위 밖 쪽은 실제 사이트처럼 빈 목록이다.
function pages(...counts: number[]) {
  const requested: number[] = []
  const fetchPage = async (page: number): Promise<SleepnetClinic[]> => {
    requested.push(page)
    return Array.from({ length: counts[page - 1] ?? 0 }, (_, i) => ({ name: `${page}-${i}`, address: "서울", phone: null, homepage: null }))
  }
  return { fetchPage, requested }
}

test("빈 쪽이 나올 때까지 모든 쪽을 모은다", async () => {
  const { fetchPage, requested } = pages(15, 15, 3)
  assert.equal((await collectPages(fetchPage)).length, 33)
  assert.deepEqual(requested, [1, 2, 3, 4])
})

test("1쪽이 비면 실패한다", async () => {
  await assert.rejects(collectPages(pages().fetchPage), /1쪽/)
})

test("안전 상한까지 빈 쪽이 나오지 않으면 실패한다", async () => {
  const { fetchPage, requested } = pages(...Array<number>(MAX_PAGES + 5).fill(15))
  await assert.rejects(collectPages(fetchPage), /빈 쪽이 나오지 않았습니다/)
  assert.equal(requested.length, MAX_PAGES)
})

test("쪽을 가져오다 실패하면 그대로 실패한다", async () => {
  await assert.rejects(
    collectPages(async (page) => {
      if (page === 2) throw new Error("503")
      return pages(15).fetchPage(page)
    }),
    /503/,
  )
})
