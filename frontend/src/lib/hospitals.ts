import data from "@/data/hospitals.json"

// 지역 선택에 보여주는 순서다. 크롤러(crawler/src/sources/resmed.ts)의 Region과 같아야 한다.
export const REGIONS = [
  "서울",
  "경기",
  "인천",
  "부산",
  "대구",
  "광주",
  "대전",
  "울산",
  "세종",
  "강원",
  "충북",
  "충남",
  "전북",
  "전남",
  "경북",
  "경남",
  "제주",
] as const

export type Region = (typeof REGIONS)[number]

export type Hospital = {
  id: string
  name: string
  region: Region
  address: string
  phone: string | null
  lat: number
  lng: number
  // 레즈메드 상세 페이지. 공공 데이터에만 있는 병원(id가 "hira-"로 시작)은 null이다.
  sourceUrl: string | null
  homepage: string | null
  listed: boolean // 대한수면연구학회 수면클리닉 찾기 목록에 있음
}

export type HospitalData = {
  crawledAt: string
  hiraVersion: string // 공공 데이터 기준 시점 (예: "2026.6")
  items: Hospital[]
}

export type ClinicLink = {
  target: "resmed" | "homepage" | "map"
  href: string
  label: string
}

// 주소 둘째 단어(시·군·구)를 붙여 같은 이름의 다른 지역 병원이 먼저 나오지 않게 한다.
export function mapSearchUrl(hospital: Hospital): string {
  const district = hospital.address.split(/\s+/)[1] ?? ""
  const query = `${hospital.name} ${district}`.trim()
  return `https://map.naver.com/p/search/${encodeURIComponent(query)}`
}

// 카드의 주요 버튼이다. 크롤링한 원 페이지가 있으면 그쪽이 먼저다.
export function clinicLink(hospital: Hospital): ClinicLink {
  if (hospital.sourceUrl)
    return {
      target: "resmed",
      href: hospital.sourceUrl,
      label: "병원 정보 보기",
    }
  if (hospital.homepage)
    return {
      target: "homepage",
      href: hospital.homepage,
      label: "병원 홈페이지 보기",
    }
  return { target: "map", href: mapSearchUrl(hospital), label: "지도에서 보기" }
}

// "2026.6" → "2026년 6월"
export function formatHiraVersion(version: string): string {
  const [year, month] = version.split(".")
  return month ? `${year}년 ${Number(month)}월` : version
}

export type Coords = { lat: number; lng: number }

export type HospitalWithDistance = Hospital & { distanceKm: number }

// 데이터가 비었을 때 대신 안내하는 원 페이지다.
export const CLINIC_FINDER_URL = "https://www.resmed.kr/psg-finder"

export function getHospitalData(): HospitalData {
  return data as HospitalData
}

export function listRegions(
  items: Hospital[],
): { region: Region; count: number }[] {
  return REGIONS.map((region) => ({
    region,
    count: items.filter((h) => h.region === region).length,
  })).filter((r) => r.count > 0)
}

// 지역 순서 → 주소 가나다순. 같은 시·군·구 병원이 모인다. region이 null이면 전국이다.
export function filterByRegion(
  items: Hospital[],
  region: Region | null,
): Hospital[] {
  return items
    .filter((h) => region === null || h.region === region)
    .sort(
      (a, b) =>
        REGIONS.indexOf(a.region) - REGIONS.indexOf(b.region) ||
        a.address.localeCompare(b.address, "ko"),
    )
}

// "전국" 보기에서 시·도 소제목 아래에 묶어 보여줄 때 쓴다.
export function groupByRegion(
  items: Hospital[],
): { region: Region; items: Hospital[] }[] {
  return listRegions(items).map(({ region }) => ({
    region,
    items: filterByRegion(items, region),
  }))
}

const EARTH_RADIUS_KM = 6371

const toRadians = (degrees: number) => (degrees * Math.PI) / 180

// 하버사인 직선거리. 가까운 순 정렬에만 쓴다.
export function distanceKm(a: Coords, b: Coords): number {
  const dLat = toRadians(b.lat - a.lat)
  const dLng = toRadians(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a.lat)) *
      Math.cos(toRadians(b.lat)) *
      Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h))
}

export function sortByDistance(
  items: Hospital[],
  origin: Coords,
): HospitalWithDistance[] {
  return items
    .map((h) => ({ ...h, distanceKm: distanceKm(origin, h) }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
}

export function formatDistance(km: number): string {
  const meters = Math.round(km * 10) * 100
  if (meters < 1000) return `${Math.max(meters, 100)}m`
  return km >= 10 ? `${Math.round(km)}km` : `${km.toFixed(1)}km`
}

export function formatCrawledAt(iso: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "long",
    day: "numeric",
  }).format(new Date(iso))
}
