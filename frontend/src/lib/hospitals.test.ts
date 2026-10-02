import { describe, expect, it } from "vitest"

import {
  clinicLink,
  distanceKm,
  formatHiraVersion,
  mapSearchUrl,
  filterByRegion,
  formatCrawledAt,
  formatDistance,
  getHospitalData,
  groupByRegion,
  listRegions,
  sortByDistance,
  type Hospital,
} from "./hospitals"

function hospital(
  id: string,
  region: Hospital["region"],
  address: string,
  lat: number,
  lng: number,
): Hospital {
  return {
    id,
    name: `${id}의원`,
    region,
    address,
    phone: null,
    lat,
    lng,
    sourceUrl: `https://www.resmed.kr/psg-finder/${id}`,
    homepage: null,
    listed: false,
  }
}

describe("clinicLink", () => {
  const base = hospital("seoul-a", "서울", "서울특별시 강남구 논현로 1", 0, 0)

  it("레즈메드 상세 페이지가 있으면 그쪽으로 보낸다", () => {
    const link = clinicLink({ ...base, homepage: "https://a.kr" })
    expect(link.target).toBe("resmed")
    expect(link.href).toBe(base.sourceUrl)
    expect(link.label).toBe("병원 정보 보기")
  })

  it("공공 데이터에만 있으면 홈페이지, 없으면 지도 검색으로 보낸다", () => {
    const onlyHira = { ...base, id: "hira-abc", sourceUrl: null }
    expect(clinicLink({ ...onlyHira, homepage: "https://a.kr" })).toEqual({
      target: "homepage",
      href: "https://a.kr",
      label: "병원 홈페이지 보기",
    })
    const map = clinicLink(onlyHira)
    expect(map.target).toBe("map")
    expect(map.label).toBe("지도에서 보기")
    expect(map.href).toBe(mapSearchUrl(onlyHira))
  })

  it("지도 검색어에 병원명과 시·군·구를 넣는다", () => {
    expect(decodeURIComponent(mapSearchUrl(base))).toBe(
      "https://map.naver.com/p/search/seoul-a의원 강남구",
    )
  })

  it("공공 데이터 기준 시점을 읽기 쉽게 바꾼다", () => {
    expect(formatHiraVersion("2026.6")).toBe("2026년 6월")
    expect(formatHiraVersion("2026.12")).toBe("2026년 12월")
  })
})

const ITEMS = [
  hospital("busan", "부산", "부산광역시 해운대구 좌동로 1", 35.17, 129.17),
  hospital("seoul-b", "서울", "서울특별시 서초구 서초대로 1", 37.49, 127.01),
  hospital("seoul-a", "서울", "서울특별시 강남구 논현로 1", 37.51, 127.03),
  hospital("gyeonggi", "경기", "경기도 성남시 분당구 판교로 1", 37.39, 127.11),
]

const ids = (items: Hospital[]) => items.map((h) => h.id)

describe("listRegions", () => {
  it("병원이 있는 지역만 정해진 순서로, 건수와 함께 돌려준다", () => {
    expect(listRegions(ITEMS)).toEqual([
      { region: "서울", count: 2 },
      { region: "경기", count: 1 },
      { region: "부산", count: 1 },
    ])
  })
})

describe("filterByRegion", () => {
  it("고른 지역만 주소 가나다순으로 돌려준다", () => {
    expect(ids(filterByRegion(ITEMS, "서울"))).toEqual(["seoul-a", "seoul-b"])
  })

  it("null이면 전체를 지역 순서, 주소 순으로 돌려준다", () => {
    expect(ids(filterByRegion(ITEMS, null))).toEqual([
      "seoul-a",
      "seoul-b",
      "gyeonggi",
      "busan",
    ])
  })

  it("병원이 없는 지역이면 빈 배열이다", () => {
    expect(filterByRegion(ITEMS, "제주")).toEqual([])
  })

  it("원본 배열을 바꾸지 않는다", () => {
    filterByRegion(ITEMS, null)
    expect(ITEMS[0].id).toBe("busan")
  })
})

describe("groupByRegion", () => {
  it("병원이 있는 지역만 정해진 순서로 묶고, 지역 안은 주소 가나다순이다", () => {
    expect(groupByRegion(ITEMS).map((g) => [g.region, ids(g.items)])).toEqual([
      ["서울", ["seoul-a", "seoul-b"]],
      ["경기", ["gyeonggi"]],
      ["부산", ["busan"]],
    ])
  })
})

describe("distanceKm", () => {
  it("서울시청에서 부산시청까지 약 325km", () => {
    const km = distanceKm(
      { lat: 37.5665, lng: 126.978 },
      { lat: 35.1796, lng: 129.0756 },
    )
    expect(km).toBeGreaterThan(320)
    expect(km).toBeLessThan(330)
  })
})

describe("sortByDistance", () => {
  it("가까운 순으로 정렬하고 거리를 붙인다", () => {
    const sorted = sortByDistance(ITEMS, { lat: 37.498, lng: 127.028 })
    expect(ids(sorted)).toEqual(["seoul-a", "seoul-b", "gyeonggi", "busan"])
    expect(sorted[0].distanceKm).toBeLessThan(2)
  })
})

describe("formatDistance", () => {
  it("1km 미만은 100m 단위, 10km 미만은 소수 한 자리, 그 이상은 정수", () => {
    expect(formatDistance(0.04)).toBe("100m")
    expect(formatDistance(0.84)).toBe("800m")
    expect(formatDistance(0.96)).toBe("1.0km")
    expect(formatDistance(2.34)).toBe("2.3km")
    expect(formatDistance(12.6)).toBe("13km")
  })
})

describe("formatCrawledAt", () => {
  it("한국 시간 기준 날짜로 쓴다", () => {
    expect(formatCrawledAt("2026-10-01T18:00:00.000Z")).toBe("10월 2일")
  })
})

describe("getHospitalData", () => {
  it("수집 데이터가 계약을 지킨다", () => {
    const { crawledAt, items } = getHospitalData()
    expect(Number.isNaN(Date.parse(crawledAt))).toBe(false)
    expect(items.length).toBeGreaterThanOrEqual(600)
    expect(new Set(items.map((h) => h.id)).size).toBe(items.length)
    // 레즈메드 병원은 337곳 안팎이고 모두 원 페이지 링크가 있다(과제의 크롤링 외부 링크).
    expect(items.filter((h) => h.sourceUrl).length).toBeGreaterThanOrEqual(300)
    for (const h of items) {
      if (h.id.startsWith("hira-")) expect(h.sourceUrl).toBeNull()
      else expect(h.sourceUrl).toBe(`https://www.resmed.kr/psg-finder/${h.id}`)
      if (h.homepage) expect(h.homepage).toMatch(/^https?:\/\//)
      expect(h.name).not.toBe("")
      expect(h.address).not.toBe("")
    }
    expect(listRegions(items).reduce((sum, r) => sum + r.count, 0)).toBe(
      items.length,
    )
  })

  // 레즈메드 원본 좌표·시·도가 틀렸던 병원이다. 크롤러가 공공 데이터로 고친 값이 유지되는지 본다.
  it("좌표가 한국 안에 있고 알려진 원본 오류가 고쳐져 있다", () => {
    const { items } = getHospitalData()
    for (const h of items) {
      expect(h.lat).toBeGreaterThan(33)
      expect(h.lat).toBeLessThan(39)
      expect(h.lng).toBeGreaterThan(124)
      expect(h.lng).toBeLessThan(132)
      expect(h.name.length).toBeLessThanOrEqual(40)
    }
    const byId = new Map(items.map((h) => [h.id, h]))
    expect(byId.get("gyeonggibomboment")?.lat).toBeCloseTo(37.65, 1)
    expect(byId.get("gyeonggico365ent")?.lat).toBeCloseTo(37.8, 1)
    for (const h of items.filter((h) => h.address.startsWith("경상남도"))) {
      expect(h.region).toBe("경남")
    }
  })
})
