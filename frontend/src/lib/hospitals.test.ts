import { describe, expect, it } from "vitest"

import {
  distanceKm,
  filterByRegion,
  formatCrawledAt,
  formatDistance,
  getHospitalData,
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
  }
}

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
    expect(items.length).toBeGreaterThanOrEqual(300)
    expect(new Set(items.map((h) => h.id)).size).toBe(items.length)
    for (const h of items) {
      expect(h.sourceUrl).toBe(`https://www.resmed.kr/psg-finder/${h.id}`)
      expect(h.name).not.toBe("")
      expect(h.address).not.toBe("")
    }
    expect(listRegions(items).reduce((sum, r) => sum + r.count, 0)).toBe(
      items.length,
    )
  })
})
