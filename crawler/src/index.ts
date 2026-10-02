import { rename, writeFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"

import { assertValid, merge } from "./merge.ts"
import { loadSnapshot } from "./sources/hira.ts"
import { crawl as crawlResmed } from "./sources/resmed.ts"

// 대상 페이지 구조가 바뀌면 건수가 크게 줄어든다. 그때는 덮어쓰지 않아 이전 데이터로 서비스가 유지된다.
const MIN_ITEMS = 200

// 좌표 교정이 이 거리를 넘으면 레즈메드 원본이 다른 도시를 가리키던 것이라 로그로 남겨 확인한다.
const LOG_MOVED_KM = 1

const OUTPUT = fileURLToPath(new URL("../../frontend/src/data/hospitals.json", import.meta.url))

async function main() {
  const snapshot = await loadSnapshot()
  console.log(`심평원 스냅샷 ${snapshot.version}: ${snapshot.items.length}건`)

  const resmed = await crawlResmed()
  console.log(`레즈메드 병원찾기: ${resmed.length}건`)
  if (resmed.length < MIN_ITEMS) {
    throw new Error(`수집 결과가 ${resmed.length}건으로 ${MIN_ITEMS}건보다 적어 저장하지 않습니다`)
  }

  const { hospitals, matched, unmatched } = merge(resmed, snapshot.items)
  console.log(`스냅샷과 맞춘 병원: ${matched.length}건, 못 맞춘 병원: ${unmatched.length}건`)
  for (const h of unmatched) console.log(`  못 맞춤: ${h.name} | ${h.address} | ${h.phone ?? "전화 없음"}`)

  const moved = matched.filter((m) => m.movedKm > LOG_MOVED_KM).sort((a, b) => b.movedKm - a.movedKm)
  console.log(`좌표가 ${LOG_MOVED_KM}km 넘게 바뀐 병원: ${moved.length}건`)
  for (const { hospital, movedKm } of moved) console.log(`  ${movedKm.toFixed(1)}km: ${hospital.name} (${hospital.id})`)

  assertValid(hospitals)

  const data = { crawledAt: new Date().toISOString(), items: hospitals }
  // 쓰는 도중 멈추면 빈 파일이 남는다. 다 쓴 뒤 바꿔치기해 이전 데이터를 지킨다.
  await writeFile(`${OUTPUT}.tmp`, JSON.stringify(data, null, 2) + "\n")
  await rename(`${OUTPUT}.tmp`, OUTPUT)
  console.log(`저장: ${OUTPUT} (${hospitals.length}건)`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
