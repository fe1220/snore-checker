import { writeFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"

// 수집 대상별 파서는 src/sources/에 두고 여기에 등록한다. 필드 계약은 docs/03-tech-spec.md를 따른다.
type Source = { name: string; crawl: () => Promise<unknown[]> }

const sources: Source[] = []

const OUTPUT = fileURLToPath(new URL("../../frontend/src/data/hospitals.json", import.meta.url))

async function main() {
  const items: unknown[] = []
  for (const source of sources) {
    const result = await source.crawl()
    console.log(`${source.name}: ${result.length}건`)
    items.push(...result)
  }

  // 비어 있으면 덮어쓰지 않는다. 실패 시 이전 데이터로 서비스가 유지되게 하기 위해서다.
  if (items.length === 0) throw new Error("수집 결과가 비어 있어 저장하지 않습니다")

  const data = { crawledAt: new Date().toISOString(), items }
  await writeFile(OUTPUT, JSON.stringify(data, null, 2) + "\n")
  console.log(`저장: ${OUTPUT} (${items.length}건)`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
