import { fetchText } from "../http.ts"

const LIST_URL = "https://www.resmed.kr/psg-finder"

// 시·도와 지역번호는 merge가 주소로 정한다. 원본의 시·도 값은 주소와 다른 병원이 있어 쓰지 않는다.
export type ResmedHospital = {
  id: string
  name: string
  address: string
  phone: string | null
  lat: number
  lng: number
  sourceUrl: string
}

function pick(block: string, pattern: RegExp): string | null {
  const value = pattern.exec(block)?.[1]?.trim()
  return value ? value.replaceAll("&amp;", "&") : null
}

// 병원 하나는 `var html = "..."` 문자열과 바로 뒤 `locations.push({...})` 한 쌍이다.
// HTML이 JS 문자열 안에 있어 따옴표가 \" 로 적혀 있다.
export function parse(html: string): ResmedHospital[] {
  const hospitals: ResmedHospital[] = []

  for (const chunk of html.split("var html = ").slice(1)) {
    const end = chunk.indexOf("});")
    if (end === -1) continue
    const block = chunk.slice(0, end)

    const name = pick(block, /item-title title3\\">([^<]*)</)
    const address = pick(block, /<p>([^<]*)<br>/)
    const id = pick(block, /href=\\"psg-finder\/([a-z0-9-]+)\\"/)
    const lat = Number(pick(block, /'lat': (-?[\d.]+)/) ?? NaN)
    const lng = Number(pick(block, /'lng': (-?[\d.]+)/) ?? NaN)

    if (!name || !address || !id || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      console.warn(`건너뜀: 필수 값이 없습니다 (${name ?? id ?? "이름 없음"})`)
      continue
    }

    hospitals.push({
      id,
      name,
      address,
      phone: pick(block, /item-phone\\">([^<]*)</),
      lat,
      lng,
      sourceUrl: `${LIST_URL}/${id}`,
    })
  }

  return hospitals
}

export async function crawl(): Promise<ResmedHospital[]> {
  return parse(await fetchText(LIST_URL))
}
