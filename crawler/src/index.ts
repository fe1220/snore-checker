import { rename, writeFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"

import { assertValid, markListed, merge } from "./merge.ts"
import { loadSnapshot } from "./sources/hira.ts"
import { crawl as crawlResmed } from "./sources/resmed.ts"
import { crawl as crawlSleepnet } from "./sources/sleepnet.ts"

// 대상 페이지 구조가 바뀌면 건수가 크게 줄어든다. 그때는 덮어쓰지 않아 이전 데이터로 서비스가 유지된다.
// 스냅샷만으로도 합친 건수 기준을 넘으므로, 레즈메드 원 페이지 링크가 사라지지 않도록 레즈메드 건수를 따로 본다.
const MIN_RESMED_ITEMS = 200
const MIN_ITEMS = 600

// 좌표 교정이 이 거리를 넘으면 레즈메드 원본이 다른 도시를 가리키던 것이라 로그로 남겨 확인한다.
const LOG_MOVED_KM = 1

const OUTPUT = fileURLToPath(new URL("../../frontend/src/data/hospitals.json", import.meta.url))

async function main() {
  const snapshot = await loadSnapshot()
  console.log(`심평원 스냅샷 ${snapshot.version}: ${snapshot.items.length}건`)

  const resmed = await crawlResmed()
  console.log(`레즈메드 병원찾기: ${resmed.length}건`)
  if (resmed.length < MIN_RESMED_ITEMS) {
    throw new Error(`레즈메드 수집 결과가 ${resmed.length}건으로 ${MIN_RESMED_ITEMS}건보다 적어 저장하지 않습니다`)
  }

  const merged = merge(resmed, snapshot.items)
  const { matched, unmatched, added, possibleDuplicates, skippedKind } = merged
  console.log(`스냅샷과 맞춘 병원: ${matched.length}건, 못 맞춘 병원: ${unmatched.length}건`)
  for (const h of unmatched) console.log(`  못 맞춤: ${h.name} | ${h.address} | ${h.phone ?? "전화 없음"}`)

  console.log(`스냅샷에서 추가 ${added.length}, 같을 수 있어 뺀 것 ${possibleDuplicates.length}, 종별로 뺀 것 ${skippedKind.length}`)
  for (const { hospital, item } of possibleDuplicates) {
    console.log(`  같을 수 있음: ${hospital.name} | ${hospital.address} | ${hospital.phone ?? "전화 없음"}`)
    console.log(`            ↔ ${item.name} | ${item.address} | ${item.phone ?? "전화 없음"}`)
  }
  for (const item of skippedKind) console.log(`  종별로 뺌(${item.kind}): ${item.name} | ${item.address}`)

  const moved = matched.filter((m) => m.movedKm > LOG_MOVED_KM).sort((a, b) => b.movedKm - a.movedKm)
  console.log(`좌표가 ${LOG_MOVED_KM}km 넘게 바뀐 병원: ${moved.length}건`)
  for (const { hospital, movedKm } of moved) console.log(`  ${movedKm.toFixed(1)}km: ${hospital.name} (${hospital.id})`)

  // 학회 목록 수집이 실패하면 빈 목록이 와서 배지만 모두 빠진 채로 저장한다
  const clinics = await crawlSleepnet()
  const listed = markListed(merged.hospitals, clinics)
  const { hospitals } = listed
  console.log(`학회 목록 ${clinics.length}곳 중 맞춘 곳 ${listed.matched.length}, 못 맞춘 곳 ${listed.unmatched.length}, 홈페이지 채움 ${listed.homepageFilled.length}`)
  for (const c of listed.unmatched) console.log(`  학회 못 맞춤: ${c.name} | ${c.address} | ${c.phone ?? "전화 없음"}`)
  console.log(`listed 병원: ${hospitals.filter((h) => h.listed).length}곳`)

  if (hospitals.length < MIN_ITEMS) {
    throw new Error(`합친 결과가 ${hospitals.length}건으로 ${MIN_ITEMS}건보다 적어 저장하지 않습니다`)
  }
  assertValid(hospitals)

  const data = { crawledAt: new Date().toISOString(), hiraVersion: snapshot.version, items: hospitals }
  // 쓰는 도중 멈추면 빈 파일이 남는다. 다 쓴 뒤 바꿔치기해 이전 데이터를 지킨다.
  await writeFile(`${OUTPUT}.tmp`, JSON.stringify(data, null, 2) + "\n")
  await rename(`${OUTPUT}.tmp`, OUTPUT)
  console.log(`저장: ${OUTPUT} (${hospitals.length}건)`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
