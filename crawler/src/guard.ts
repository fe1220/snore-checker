import type { Hospital } from "./merge.ts"

// 이전 저장본보다 이만큼 넘게 줄면 대상 페이지 일부가 빠진 것으로 보고 저장하지 않는다.
// 레즈메드에서 빠진 병원은 스냅샷 병원으로 대체돼 합친 건수로는 티가 나지 않아, 원 페이지 링크가 있는 병원 수를 따로 본다.
export const MAX_DROP_RATIO = 0.2

const COUNTS: { label: string; count: (hospitals: Hospital[]) => number }[] = [
  { label: "레즈메드 출처 병원", count: (hs) => hs.filter((h) => h.sourceUrl !== null).length },
  { label: "학회 목록 병원", count: (hs) => hs.filter((h) => h.listed).length },
]

// 첫 실행이라 이전 저장본이 없으면 비교하지 않는다.
export function assertNoSharpDrop(previous: Hospital[] | null, next: Hospital[]): void {
  if (previous === null) return
  for (const { label, count } of COUNTS) {
    const before = count(previous)
    const after = count(next)
    if (after < before * (1 - MAX_DROP_RATIO)) {
      throw new Error(`${label}이 ${before}곳에서 ${after}곳으로 ${MAX_DROP_RATIO * 100}% 넘게 줄어 저장하지 않습니다`)
    }
  }
}

// 학회 목록 수집이 실패했을 때 배지와 학회에서 채운 홈페이지를 이전 저장본에서 id로 이어 붙인다.
// 새로 받은 홈페이지가 있으면 그 값을 쓴다. 학회 홈페이지는 비어 있을 때만 채우던 값이라서다.
export function carryListed(previous: Hospital[], next: Hospital[]): Hospital[] {
  const byId = new Map(previous.map((h) => [h.id, h]))
  return next.map((h) => {
    const before = byId.get(h.id)
    return { ...h, listed: before?.listed ?? false, homepage: h.homepage ?? before?.homepage ?? null }
  })
}

// 원본 사이트가 순서만 바꿔도 diff가 수백 줄 생기지 않도록 id 순으로 저장한다.
export function sortById(hospitals: Hospital[]): Hospital[] {
  return hospitals.toSorted((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
}
