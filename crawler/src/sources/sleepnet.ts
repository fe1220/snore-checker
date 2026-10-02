import { fetchText } from "../http.ts"
import type { Place } from "../match.ts"

// 대한수면연구학회 수면클리닉 찾기. 학회 목록에 있다는 배지만 붙이므로 원 페이지 링크는 쓰지 않는다(상세가 모달이라 주소도 없다).
const LIST_URL = "https://www.sleepnet.or.kr/hospital/find"
const PAGES = 5
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

// 배지 때문에 병원 목록 갱신이 멈추면 안 된다. 한 쪽이라도 실패하면 재시도하지 않고 빈 목록을 돌려준다(배지를 모두 뗀다).
export async function crawl(): Promise<SleepnetClinic[]> {
  const clinics: SleepnetClinic[] = []
  try {
    for (let page = 1; page <= PAGES; page++) {
      if (page > 1) await new Promise((resolve) => setTimeout(resolve, PAGE_INTERVAL_MS))
      const found = parse(await fetchText(`${LIST_URL}?page=${page}`))
      // 쪽 하나가 비면 구조가 바뀐 것이라 일부만 배지를 붙이지 않는다
      if (found.length === 0) throw new Error(`${page}쪽에서 병원을 찾지 못했습니다`)
      clinics.push(...found)
    }
  } catch (error) {
    console.error(`학회 목록 수집 실패, 배지 없이 저장합니다: ${error instanceof Error ? error.message : error}`)
    return []
  }
  return clinics
}
