import { createHash } from "node:crypto"

import { coreName, findMatch, normalizeName, normalizePhone } from "./match.ts"
import { type HiraItem, inKorea } from "./sources/hira.ts"
import { type Region, type ResmedHospital, withAreaCode } from "./sources/resmed.ts"
import type { SleepnetClinic } from "./sources/sleepnet.ts"

export type Hospital = Omit<ResmedHospital, "sourceUrl"> & {
  // 레즈메드 상세 페이지. 공공 데이터에만 있는 병원은 원 페이지가 없어 null
  sourceUrl: string | null
  homepage: string | null
  // 대한수면연구학회 수면클리닉 목록에 있음
  listed: boolean
  // 병원 규모. 공공 데이터와 맞추지 못한 병원은 null
  kind: Kind | null
}

export type Kind = "의원" | "병원" | "종합병원" | "상급종합병원"

const KIND_BY_HIRA: Record<string, Kind> = {
  의원: "의원",
  병원: "병원",
  종합병원: "종합병원",
  상급종합: "상급종합병원",
}

// 화면에 보여줄 규모 네 가지만 남긴다. 치과병원·정신병원처럼 그 밖의 종별은 보여주지 않는다.
export function kindOf(hiraKind: string): Kind | null {
  return KIND_BY_HIRA[hiraKind] ?? null
}

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

// 스냅샷 홈페이지 칸은 "www.knping.com"처럼 스킴 없이 적힌 값이 섞여 있다. 링크로 열 수 없는 값은 버린다.
export function normalizeHomepage(value: string | null): string | null {
  const text = value?.trim() ?? ""
  if (text === "") return null
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(text) ? text : `https://${text}`
  if (!URL.canParse(withScheme)) return null
  const url = new URL(withScheme)
  if (url.protocol !== "http:" && url.protocol !== "https:") return null
  if (!url.hostname.includes(".")) return null
  return withScheme
}

// 수면다원검사를 받으러 가는 곳으로 안내할 수 있는 종류만 추가한다. 치과병원·정신병원 등은 뺀다.
const ADDABLE_KINDS = new Set(["의원", "병원", "종합병원", "상급종합"])

function hiraId(ykiho: string): string {
  return `hira-${createHash("sha256").update(ykiho).digest("hex").slice(0, 10)}`
}

// 시·도 표기가 출처마다 갈려 약칭으로 바꾼 뒤 시·군·구를 붙인다. 세종시는 시·군·구가 없다.
function districtOf(address: string): string {
  const tokens = address.trim().split(/\s+/)
  if (tokens[0] === "대한민국") tokens.shift()
  const region = regionOf(address)
  return region === "세종" ? region : `${region} ${tokens[1]}`
}

function fromSnapshot(item: HiraItem): Hospital {
  const region = regionOf(item.address)
  return {
    id: hiraId(item.ykiho),
    name: item.name,
    region,
    address: item.address,
    phone: item.phone === null ? null : withAreaCode(item.phone, region),
    lat: item.lat,
    lng: item.lng,
    sourceUrl: null,
    homepage: normalizeHomepage(item.homepage),
    listed: false,
    kind: kindOf(item.kind),
  }
}

// 맞추기 규칙으로는 못 맞췄지만 같은 병원일 수 있는 경우(이름이 "온종합병원"↔"온병원"으로 바뀜 등).
// 둘 다 올리면 같은 병원이 두 번 나오므로, 이런 스냅샷 병원은 추가하지 않고 로그로 확인한다.
function mayBeSame(hospital: Hospital, candidate: Hospital): boolean {
  // 같은 번호를 쓰는 다른 구의 병원이 있어(광주 남구 이비인후과 ↔ 동구 정신건강의학과) 시·군·구가 같을 때만 본다
  if (districtOf(hospital.address) !== districtOf(candidate.address)) return false
  const phone = normalizePhone(hospital.phone)
  if (phone !== "" && phone === normalizePhone(candidate.phone)) return true
  // "온종합병원"↔"온병원"은 정리한 이름끼리는 서로 품지 않아, 진료과·기관 종류·"종합"을 지운 부분도 본다
  const core = (name: string) => coreName(name).replace("종합", "")
  return contains(normalizeName(hospital.name), normalizeName(candidate.name)) || contains(core(hospital.name), core(candidate.name))
}

function contains(a: string, b: string): boolean {
  return a !== "" && b !== "" && (a.includes(b) || b.includes(a))
}

export type MergeResult = {
  hospitals: Hospital[]
  matched: { hospital: Hospital; movedKm: number }[]
  unmatched: Hospital[]
  added: Hospital[]
  possibleDuplicates: { hospital: Hospital; item: HiraItem }[]
  skippedKind: HiraItem[]
}

// 레즈메드 좌표는 다른 도시를 가리키는 곳이 있어 공공 데이터 좌표로 바꾼다. 원 페이지 링크와 나머지 값은 레즈메드 것을 둔다.
// 레즈메드 목록에 없는 수면다원검사 실시기관은 스냅샷 값으로 추가한다.
export function merge(resmed: ResmedHospital[], snapshot: HiraItem[]): MergeResult {
  const result: MergeResult = { hospitals: [], matched: [], unmatched: [], added: [], possibleDuplicates: [], skippedKind: [] }
  const used = new Set<HiraItem>()

  for (const original of resmed) {
    const region = regionOf(original.address)
    const found = findMatch(original, snapshot)

    if (!found) {
      const hospital = { ...original, region, homepage: null, listed: false, kind: null }
      result.hospitals.push(hospital)
      result.unmatched.push(hospital)
      continue
    }

    used.add(found)
    const hospital = {
      ...original,
      name: original.name.length > MAX_NAME_LENGTH ? found.name : original.name,
      region,
      lat: found.lat,
      lng: found.lng,
      homepage: normalizeHomepage(found.homepage),
      listed: false,
      kind: kindOf(found.kind),
    }
    result.hospitals.push(hospital)
    result.matched.push({ hospital, movedKm: distanceKm(original, found) })
  }

  for (const item of snapshot) {
    if (used.has(item)) continue
    if (!ADDABLE_KINDS.has(item.kind)) {
      result.skippedKind.push(item)
      continue
    }
    const hospital = fromSnapshot(item)
    const same = result.unmatched.find((h) => mayBeSame(h, hospital))
    if (same) {
      result.possibleDuplicates.push({ hospital: same, item })
      continue
    }
    result.hospitals.push(hospital)
    result.added.push(hospital)
  }

  return result
}

export type ListedResult = {
  hospitals: Hospital[]
  matched: { clinic: SleepnetClinic; hospital: Hospital }[]
  unmatched: SleepnetClinic[]
  homepageFilled: Hospital[]
}

// 학회 목록도 같은 맞추기 규칙을 쓴다. 후보가 둘 이상이면 findMatch가 맞추지 않아 배지를 붙이지 않는다.
// 배지만 붙이고 이름·주소·전화는 바꾸지 않는다. 홈페이지는 비어 있을 때만 학회 값으로 채운다.
export function markListed(hospitals: Hospital[], clinics: SleepnetClinic[]): ListedResult {
  const result: ListedResult = { hospitals: hospitals.map((h) => ({ ...h, listed: false })), matched: [], unmatched: [], homepageFilled: [] }

  for (const clinic of clinics) {
    const hospital = findMatch(clinic, result.hospitals)
    if (!hospital) {
      result.unmatched.push(clinic)
      continue
    }
    hospital.listed = true
    const homepage = normalizeHomepage(clinic.homepage)
    if (hospital.homepage === null && homepage !== null) {
      hospital.homepage = homepage
      result.homepageFilled.push(hospital)
    }
    result.matched.push({ clinic, hospital })
  }

  return result
}

const SOURCE_URL_PREFIX = "https://www.resmed.kr/psg-finder/"
const HIRA_ID_PREFIX = "hira-"

// 저장 직전 마지막 확인. 하나라도 어긋나면 저장하지 않아 이전 데이터가 남는다.
export function assertValid(hospitals: Hospital[]): void {
  const seen = new Set<string>()
  for (const h of hospitals) {
    const label = `${h.name || "이름 없음"} (${h.id || "id 없음"})`
    for (const field of ["id", "name", "region", "address"] as const) {
      if (typeof h[field] !== "string" || h[field].trim() === "") throw new Error(`${label}: ${field}가 비었습니다`)
    }
    // 레즈메드 병원은 원 페이지 링크가 반드시 있고, 공공 데이터에만 있는 병원은 없다
    const expectedSourceUrl = h.id.startsWith(HIRA_ID_PREFIX) ? null : `${SOURCE_URL_PREFIX}${h.id}`
    if (h.sourceUrl !== expectedSourceUrl) throw new Error(`${label}: sourceUrl이 원 페이지 주소가 아닙니다`)
    if (h.homepage !== null && normalizeHomepage(h.homepage) !== h.homepage) {
      throw new Error(`${label}: homepage가 http(s) 주소가 아닙니다 (${h.homepage})`)
    }
    if (typeof h.listed !== "boolean") throw new Error(`${label}: listed가 true나 false가 아닙니다`)
    if (!inKorea(h.lat, h.lng)) throw new Error(`${label}: 좌표가 한국 범위 밖입니다 (${h.lat}, ${h.lng})`)
    if (seen.has(h.id)) throw new Error(`${label}: id가 겹칩니다`)
    seen.add(h.id)
  }
}
