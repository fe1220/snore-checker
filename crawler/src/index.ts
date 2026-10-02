import { writeFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"

import { crawl as crawlResmed } from "./sources/resmed.ts"

// 수집 대상별 파서는 src/sources/에 두고 여기에 등록한다. 필드 계약은 docs/03-tech-spec.md를 따른다.
type Source = { name: string; crawl: () => Promise<unknown[]> }

const sources: Source[] = [{ name: "레즈메드 병원찾기", crawl: crawlResmed }]

// 대상 페이지 구조가 바뀌면 건수가 크게 줄어든다. 그때는 덮어쓰지 않아 이전 데이터로 서비스가 유지된다.
const MIN_ITEMS = 200

const OUTPUT = fileURLToPath(new URL("../../frontend/src/data/hospitals.json", import.meta.url))

async function main() {
  const items: unknown[] = []
  for (const source of sources) {
    const result = await source.crawl()
    console.log(`${source.name}: ${result.length}건`)
    items.push(...result)
  }

  if (items.length < MIN_ITEMS) {
    throw new Error(`수집 결과가 ${items.length}건으로 ${MIN_ITEMS}건보다 적어 저장하지 않습니다`)
  }

  const data = { crawledAt: new Date().toISOString(), items }
  await writeFile(OUTPUT, JSON.stringify(data, null, 2) + "\n")
  console.log(`저장: ${OUTPUT} (${items.length}건)`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
