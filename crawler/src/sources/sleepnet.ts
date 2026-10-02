import { fetchText } from "../http.ts"
import type { Place } from "../match.ts"

// 대한수면연구학회 수면클리닉 찾기. 학회 목록에 있다는 배지만 붙이므로 원 페이지 링크는 쓰지 않는다(상세가 모달이라 주소도 없다).
const LIST_URL = "https://www.sleepnet.or.kr/hospital/find"
// 2026-10 기준 5쪽이다. 쪽 수가 늘어도 이 안에서 끝나도록 넉넉히 둔 안전 상한이다.
export const MAX_PAGES = 20
const PAGE_INTERVAL_MS = 1000

export type SleepnetClinic = Place & { homepage: string | null }

type Raw = { name?: unknown; address?: unknown; address_etc?: unknown; phone?: unknown; homepage?: unknown }

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

// 속성값 안이라 따옴표가 &quot; 로 적혀 있다. &amp;는 다른 엔티티를 만들지 않도록 마지막에 푼다.
function decodeEntities(value: string): string {
  return value
    .replaceAll("&quot;", '"')
    .replaceAll("&#039;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&")
}

// 상세 주소 칸에 "-", ".", 전화번호가 들어간 병원이 있어 글자가 있는 값만 붙인다.
function addressOf(raw: Raw): string {
  const address = text(raw.address)
  const etc = text(raw.address_etc)
  return /\p{L}/u.test(etc) && !address.includes(etc) ? `${address} ${etc}` : address
}

// "1577-0888-"처럼 끝에 붙임표가 남은 값, "02-1588-1511"처럼 대표번호 앞에 지역번호를 붙인 값, "-"만 있는 값이 섞여 있다.
function phoneOf(raw: Raw): string | null {
  const phone = text(raw.phone).replace(/[–—]/g, "-").replace(/-+$/, "")
  if (!/\d/.test(phone)) return null
  return phone.replace(/^0\d{1,2}-(1\d{3}-\d{4})$/, "$1")
}

// 홈페이지 3곳이 "www.cmcseoul.or.kr"처럼 스킴 없이 적혀 있다.
function homepageOf(raw: Raw): string | null {
  const homepage = text(raw.homepage)
  if (homepage === "") return null
  return /^[a-z][a-z0-9+.-]*:/i.test(homepage) ? homepage : `https://${homepage}`
}

// 병원 하나가 `<a href="javascript:openView({...})">` 하나다. JSON이 속성값 안에 있어 다음 " 에서 끝난다.
export function parse(html: string): SleepnetClinic[] {
  const clinics: SleepnetClinic[] = []

  for (const [, json] of html.matchAll(/javascript:openView\(([^"]*)\)"/g)) {
    const raw = JSON.parse(decodeEntities(json)) as Raw
    const name = text(raw.name)
    const address = addressOf(raw)
    if (name === "" || address === "") {
      console.warn(`학회 목록 건너뜀: 필수 값이 없습니다 (${name || "이름 없음"})`)
      continue
    }
    clinics.push({ name, address, phone: phoneOf(raw), homepage: homepageOf(raw) })
  }

  return clinics
}

// 마지막 쪽 다음 쪽은 병원이 없는 빈 목록으로 온다. 1쪽부터 비면 구조가 바뀐 것이다.
// 상한까지 비지 않으면 쪽 번호를 무시하고 같은 쪽을 돌려주는 것일 수 있어 실패로 본다.
export async function collectPages(fetchPage: (page: number) => Promise<SleepnetClinic[]>): Promise<SleepnetClinic[]> {
  const clinics: SleepnetClinic[] = []
  for (let page = 1; page <= MAX_PAGES; page++) {
    const found = await fetchPage(page)
    if (found.length === 0) {
      if (page === 1) throw new Error("1쪽에서 병원을 찾지 못했습니다")
      return clinics
    }
    clinics.push(...found)
  }
  throw new Error(`${MAX_PAGES}쪽까지 빈 쪽이 나오지 않았습니다`)
}

// 실패하면 그대로 던진다. 배지를 이어 붙일지는 index.ts가 정한다.
export async function crawl(): Promise<SleepnetClinic[]> {
  return collectPages(async (page) => {
    if (page > 1) await new Promise((resolve) => setTimeout(resolve, PAGE_INTERVAL_MS))
    return parse(await fetchText(`${LIST_URL}?page=${page}`))
  })
}
