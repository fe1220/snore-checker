import { findMatch } from "./match.ts"
import { type HiraItem, inKorea } from "./sources/hira.ts"
import type { Hospital, Region } from "./sources/resmed.ts"

const REGION_BY_SIDO: Record<string, Region> = {
  서울: "서울", 서울특별시: "서울",
  부산: "부산", 부산광역시: "부산",
  대구: "대구", 대구광역시: "대구",
  인천: "인천", 인천광역시: "인천",
  광주: "광주", 광주광역시: "광주",
  대전: "대전", 대전광역시: "대전",
  울산: "울산", 울산광역시: "울산",
  세종: "세종", 세종특별자치시: "세종",
  경기: "경기", 경기도: "경기",
  강원: "강원", 강원도: "강원", 강원특별자치도: "강원",
  충북: "충북", 충청북도: "충북",
  충남: "충남", 충청남도: "충남",
  전북: "전북", 전라북도: "전북", 전북특별자치도: "전북",
  전남: "전남", 전라남도: "전남",
  경북: "경북", 경상북도: "경북",
  경남: "경남", 경상남도: "경남",
  제주: "제주", 제주특별자치도: "제주",
}

// 2026년 7월 광주와 전남이 합쳐졌지만 화면의 지역 선택은 둘을 나눠 보여준다. 광주에만 있던 구 이름으로 가른다.
const MERGED_SIDO = "전남광주통합특별시"
const GWANGJU_DISTRICTS = new Set(["동구", "서구", "남구", "북구", "광산구"])

// 레즈메드가 따로 주는 시·도 값은 주소와 다른 병원이 있어(경남 주소에 경북) 주소를 기준으로 삼는다.
export function regionOf(address: string): Region {
  const tokens = address.trim().split(/\s+/)
  if (tokens[0] === "대한민국") tokens.shift()

  const [sido, district] = tokens
  if (sido === MERGED_SIDO) return GWANGJU_DISTRICTS.has(district) ? "광주" : "전남"

  const region = REGION_BY_SIDO[sido]
  if (!region) throw new Error(`알 수 없는 시·도: ${sido} (${address})`)
  return region
}

type Point = { lat: number; lng: number }

export function distanceKm(a: Point, b: Point): number {
  const rad = Math.PI / 180
  const h =
    Math.sin(((b.lat - a.lat) * rad) / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(((b.lng - a.lng) * rad) / 2) ** 2
  return 12742 * Math.asin(Math.sqrt(h))
}

// 레즈메드 원본에 여러 병원 이름이 한 칸에 이어 붙은 병원이 있다. 정상 이름 중 가장 긴 것이 30자 안쪽이다.
const MAX_NAME_LENGTH = 40

export type MergeResult = {
  hospitals: Hospital[]
  matched: { hospital: Hospital; movedKm: number }[]
  unmatched: Hospital[]
}

// 레즈메드 좌표는 다른 도시를 가리키는 곳이 있어 공공 데이터 좌표로 바꾼다. 원 페이지 링크와 나머지 값은 레즈메드 것을 둔다.
export function merge(resmed: Hospital[], snapshot: HiraItem[]): MergeResult {
  const result: MergeResult = { hospitals: [], matched: [], unmatched: [] }

  for (const original of resmed) {
    const region = regionOf(original.address)
    const found = findMatch(original, snapshot)

    if (!found) {
      const hospital = { ...original, region }
      result.hospitals.push(hospital)
      result.unmatched.push(hospital)
      continue
    }

    const hospital = {
      ...original,
      name: original.name.length > MAX_NAME_LENGTH ? found.name : original.name,
      region,
      lat: found.lat,
      lng: found.lng,
    }
    result.hospitals.push(hospital)
    result.matched.push({ hospital, movedKm: distanceKm(original, found) })
  }

  return result
}

const SOURCE_URL_PREFIX = "https://www.resmed.kr/psg-finder/"

// 저장 직전 마지막 확인. 하나라도 어긋나면 저장하지 않아 이전 데이터가 남는다.
export function assertValid(hospitals: Hospital[]): void {
  const seen = new Set<string>()
  for (const h of hospitals) {
    const label = `${h.name || "이름 없음"} (${h.id || "id 없음"})`
    for (const field of ["id", "name", "region", "address"] as const) {
      if (typeof h[field] !== "string" || h[field].trim() === "") throw new Error(`${label}: ${field}가 비었습니다`)
    }
    if (h.sourceUrl !== `${SOURCE_URL_PREFIX}${h.id}`) throw new Error(`${label}: sourceUrl이 원 페이지 주소가 아닙니다`)
    if (!inKorea(h.lat, h.lng)) throw new Error(`${label}: 좌표가 한국 범위 밖입니다 (${h.lat}, ${h.lng})`)
    if (seen.has(h.id)) throw new Error(`${label}: id가 겹칩니다`)
    seen.add(h.id)
  }
}
