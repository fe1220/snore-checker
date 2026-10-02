import { fetchText } from "../http.ts"

const LIST_URL = "https://www.resmed.kr/psg-finder"

export type Region =
  | "서울" | "경기" | "인천" | "부산" | "대구" | "광주" | "대전" | "울산" | "세종"
  | "강원" | "충북" | "충남" | "전북" | "전남" | "경북" | "경남" | "제주"

export type Hospital = {
  id: string
  name: string
  region: Region
  address: string
  phone: string | null
  lat: number
  lng: number
  sourceUrl: string
}

// 원본 표기가 "강원도"·"서울"·"충북"처럼 섞여 있어 약칭으로 통일한다.
const REGION_BY_DISTRICT: Record<string, Region> = {
  서울: "서울",
  경기도: "경기",
  인천: "인천",
  부산: "부산",
  대구: "대구",
  광주: "광주",
  대전: "대전",
  울산: "울산",
  세종: "세종",
  강원도: "강원",
  충북: "충북",
  충남: "충남",
  전북: "전북",
  전남: "전남",
  경북: "경북",
  경남: "경남",
  제주: "제주",
}

function pick(block: string, pattern: RegExp): string | null {
  const value = pattern.exec(block)?.[1]?.trim()
  return value ? value.replaceAll("&amp;", "&") : null
}

// 병원 하나는 `var html = "..."` 문자열과 바로 뒤 `locations.push({...})` 한 쌍이다.
// HTML이 JS 문자열 안에 있어 따옴표가 \" 로 적혀 있다.
export function parse(html: string): Hospital[] {
  const hospitals: Hospital[] = []

  for (const chunk of html.split("var html = ").slice(1)) {
    const end = chunk.indexOf("});")
    if (end === -1) continue
    const block = chunk.slice(0, end)

    const name = pick(block, /item-title title3\\">([^<]*)</)
    const address = pick(block, /<p>([^<]*)<br>/)
    const id = pick(block, /href=\\"psg-finder\/([a-z0-9-]+)\\"/)
    const district = pick(block, /'district_kr': "([^"]*)"/)
    const lat = Number(pick(block, /'lat': (-?[\d.]+)/) ?? NaN)
    const lng = Number(pick(block, /'lng': (-?[\d.]+)/) ?? NaN)

    if (!name || !address || !id || !district || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      console.warn(`건너뜀: 필수 값이 없습니다 (${name ?? id ?? "이름 없음"})`)
      continue
    }

    const region = REGION_BY_DISTRICT[district]
    if (!region) throw new Error(`알 수 없는 시·도: ${district} (${name})`)

    hospitals.push({
      id,
      name,
      region,
      address,
      phone: pick(block, /item-phone\\">([^<]*)</),
      lat,
      lng,
      sourceUrl: `${LIST_URL}/${id}`,
    })
  }

  return hospitals
}

export async function crawl(): Promise<Hospital[]> {
  return parse(await fetchText(LIST_URL))
}
