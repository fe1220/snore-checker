# 구현 계획: S4 근처 수면클리닉

상태: 승인

> **에이전트용:** superpowers:subagent-driven-development로 작업 단위별로 실행한다. 단계는 체크박스(`- [ ]`)로 추적한다.

**목표:** 레즈메드 병원찾기로 넘기던 것을 멈추고, 크롤링한 병원 337곳을 `/clinics`에서 지역별·가까운 순으로 보여준 뒤 병원 원 페이지로 연결한다.

**구조:** 크롤러가 레즈메드 목록 페이지를 1회 요청해 `frontend/src/data/hospitals.json`을 쓴다. 프론트는 `lib/hospitals.ts`의 순수 함수로 이 JSON을 읽고 거르고 정렬하며, 서버 컴포넌트 페이지가 클라이언트 컴포넌트 하나(`ClinicFinder`)에 props로 내려준다.

**스택:** Node 24 (타입 스트리핑, `node:test`), Next.js App Router, Tailwind v4, shadcn/ui(base-ui), vitest. 새 의존성 없음.

**스펙:** [03-tech-spec.md](03-tech-spec.md), 디자인은 [02-design-pass.md](02-design-pass.md#s4-근처-수면클리닉), 시각 규칙은 [DESIGN.md](../DESIGN.md)

## 공통 제약

- 의존성을 추가하지 않는다. 백엔드·DB를 만들지 않는다.
- `frontend/src/data/hospitals.json`은 크롤러만 쓴다. 손으로 고치지 않는다.
- 색은 시맨틱 토큰만(`text-primary`, `border-primary`, `text-muted-foreground` 등). 간격은 `1 2 3 4 6 8 12 16`만. 터치 타겟 `h-11` 이상. 본문 16px 이상.
- 아이콘은 `lucide-react`만. `import { cn } from "cn"`은 그대로 쓴다.
- 레이어: `app → components → lib → data`. `lib`는 React·Next를 import하지 않는다. `components`·`app`은 `@/data/*`를 직접 import하지 않는다.
- 위치 좌표와 거리는 저장하지 않고 어떤 분석 이벤트에도 넣지 않는다.
- 워크트리·브랜치를 만들지 않는다. 서브에이전트는 커밋하지 않는다. 메인 세션이 작업 단위를 검토한 뒤 단위당 1개씩 커밋한다.
- 커밋할 때 경로를 명시한다. 작업 트리에 이 계획과 무관한 변경(`.claude/hooks/`, `.gitignore`, `CLAUDE.md`, `backend/`)이 있으니 `git add -A`를 쓰지 않는다.

## 작업 단위와 순서

| # | 작업 | 담당 | 소유 파일 | 의존 |
|---|---|---|---|---|
| 0 | 검증 기준 작성 | 메인 | `docs/05-verification.md` | - |
| 1 | 레즈메드 크롤러 + 데이터 | data-implementer | `crawler/`, `frontend/src/data/` | 0 |
| 2 | 병원 조회·정렬 함수 | 메인 | `frontend/src/lib/hospitals*.ts` | 0. 작성은 1과 병렬, 검사·커밋은 1의 JSON이 생긴 뒤 |
| 3 | S4 화면 (지역 방식) | frontend-implementer | `frontend/src/app/clinics/`, `frontend/src/components/clinics/`, 아래 명시한 수정 | 1, 2 |
| 4 | 내 주변 순으로 보기 | frontend-implementer | `frontend/src/components/clinics/`, `track.ts` | 3 |
| 5 | 검증 | 메인 + verifier, design-reviewer | `docs/05-verification.md` 결과 | 4 |

```
0 ─┬─ 1 (크롤러) ─┐
   └─ 2 (lib) ────┴─ 3 (화면) ─ 4 (내 주변) ─ 5 (검증)
```

---

### 작업 0: 검증 기준 작성

**파일:**
- 수정: `docs/05-verification.md` (지금 비어 있음)

- [ ] **1단계: 체크리스트를 쓴다**

```markdown
# 검증

## 체크리스트: S4 근처 수면클리닉

기준 문서: [02-design-pass](02-design-pass.md#s4-근처-수면클리닉), [03-tech-spec](03-tech-spec.md)

### 자동

- [ ] V1 `make gate`가 통과한다
- [ ] V2 `hospitals.json`: 300건 이상, id 중복 없음, 모든 `sourceUrl`이 `https://www.resmed.kr/psg-finder/`로 시작한다 (`hospitals.test.ts`)
- [ ] V3 `frontend/src/app/go/`, `clinic-redirect.tsx`가 없고 `grep -rn "go/clinic" frontend/src` 결과가 없다

### 브라우저 (375px)

- [ ] V4 리포트의 "근처 수면클리닉 찾기"가 같은 탭에서 `/clinics`로 간다. 버튼에 외부 링크 아이콘이 없다
- [ ] V5 `/clinics`에 들어왔을 때 위치 권한 창이 뜨지 않는다. "전체 · N곳"과 "레즈메드 병원찾기 · M월 D일 수집"이 보인다
- [ ] V6 지역 버튼 → 하단 시트에 병원이 있는 시·도와 건수가 나온다. 고르면 시트가 닫히고 그 지역 병원만 주소 가나다순으로 나온다
- [ ] V7 병원 정보 보기가 새 탭으로 레즈메드 병원 상세를 연다(200 응답). 전화하기가 `tel:` 링크다. 전화번호가 없는 병원(청담성모이비인후과의원)에는 전화하기가 없다
- [ ] V8 내 주변 순으로 보기: 누르는 동안 "위치 확인 중…"과 버튼 비활성 / 허용 → 가까운 순 + 카드에 거리 / 거부 → "위치 권한이 꺼져 있어요. 지역을 골라 주세요" / 실패 → "위치를 확인할 수 없어요. 지역을 골라 주세요"
- [ ] V9 내 주변 방식에서 지역을 고르면 거리가 사라지고 지역 방식으로 돌아간다
- [ ] V10 GA 요청: `clinic_click`·`clinic_call`에 `hospital_id`·`region`, `clinic_nearby`에 `result`가 있다. 좌표·거리는 어디에도 없다
- [ ] V11 가로 스크롤이 없다. 버튼 높이 44px 이상. 원시 색상값이 없다
- [ ] V12 인스타그램 인앱 브라우저에서 내 주변 순으로 보기가 동작하거나 실패 문구가 나온다 (사용자가 실제 기기로 확인)

## 결과
```

- [ ] **2단계: 문서를 커밋한다**

```bash
git add docs/02-design-pass.md docs/03-tech-spec.md docs/04-plan.md docs/05-verification.md
git commit -m "docs: specify the sleep clinic list (S4) spec, plan, and verification"
```

---

### 작업 1: 레즈메드 크롤러 + 데이터

**담당:** data-implementer

**파일:**
- 생성: `crawler/fixtures/resmed.html`
- 생성: `crawler/src/sources/resmed.ts`
- 생성: `crawler/src/sources/resmed.test.ts`
- 수정: `crawler/src/index.ts`
- 생성(크롤러 실행 결과): `frontend/src/data/hospitals.json`

**인터페이스:**
- 사용: `fetchText(url: string): Promise<string>` (`crawler/src/http.ts`, 이미 있음)
- 제공: `parse(html: string): Hospital[]`, `crawl(): Promise<Hospital[]>`, 그리고 아래 형태의 `hospitals.json`

```ts
{ crawledAt: string, items: { id: string, name: string, region: string, address: string, phone: string | null, lat: number, lng: number, sourceUrl: string }[] }
```

**배경:** `https://www.resmed.kr/psg-finder`에는 병원마다 `var html = "..."` 문자열과 바로 뒤 `locations.push({...})`가 한 쌍으로 들어 있다(337쌍). HTML이 JS 문자열 안에 있어 따옴표가 `\"`로 적혀 있다. 주소 뒤 `<br>` 다음 숫자는 우편번호인데 앞자리 0이 빠진 값도 있어 버린다. 페이지 끝에는 `${nameAttr}`이 들어간 템플릿 문자열(`var info = ...`)이 있는데 병원이 아니다.

- [ ] **1단계: 픽스처를 만든다** — `crawler/fixtures/resmed.html`

실제 페이지에서 가져온 정상 1건, 필수 값(주소·상세 링크)이 없는 1건, 전화번호가 빈 1건, 그리고 끝의 템플릿이다.

```html
<script>
  var locations = [];
  var google;
  var center = {lat: 37.532600, lng: 127.024612}; 

  var html = "<div class=\"store-item \">"+
      "<div class=\"item-title title3\">누가이비인후과의원</div>"+
  "<div class=\"item-address\">"+
    "<p>강원도 동해시 한섬로 111-7<br> 25769</p>"+
  "</div>"+
    "<div class=\"item-phone\">033-535-3600</div>"+
  "<div class=\"item-details\">"+
    "<a href=\"psg-finder/gangwonnugaent\">세부 정보보기</p>"+
      "</div>"+
      "<div class=\"item-links\">";

  html += "</div></div>";

  locations.push({
    'id': 101645632429,
    'html': html, 
    'name': "누가이비인후과의원",
    'district_kr': "강원도", 
    'lat': 37.52221, 
    'lng': 129.11555
  });

  
  var html = "<div class=\"store-item \">"+
      "<div class=\"item-title title3\">값이빠진의원</div>"+
    "<div class=\"item-phone\">02-000-0000</div>"+
      "<div class=\"item-links\">";

  html += "</div></div>";

  locations.push({
    'id': 1,
    'html': html, 
    'name': "값이빠진의원",
    'district_kr': "서울", 
    'lat': 37.5, 
    'lng': 127.0
  });

  
  var html = "<div class=\"store-item \">"+
      "<div class=\"item-title title3\">청담성모이비인후과의원</div>"+
  "<div class=\"item-address\">"+
    "<p>서울특별시 강남구 학동로53길 3-2 2층 (논현동)<br> 6060</p>"+
  "</div>"+
    "<div class=\"item-phone\"></div>"+
  "<div class=\"item-details\">"+
    "<a href=\"psg-finder/seoulcheongdament\">세부 정보보기</p>"+
      "</div>"+
      "<div class=\"item-links\">";

  html += "</div></div>";

  locations.push({
    'id': 101645632770,
    'html': html, 
    'name': "청담성모이비인후과의원",
    'district_kr': "서울", 
    'lat': 37.51714, 
    'lng': 127.03951
  });

  $('.listInnerWrapper ul li').click(function() {
    var info = `<div class=\"store-item \"><div class=\"item-title title3\">${nameAttr}</div><div class=\"item-address\"><p>${listLocationAddr}<br> 46008</p></div><div class=\"item-phone\">${phAttr}</div><div class=\"item-details\"><a href=\"psg-finder/${indAttr}">세부 정보보기</a></div></div>`
  });
</script>
```

- [ ] **2단계: 실패하는 테스트를 쓴다** — `crawler/src/sources/resmed.test.ts`

```ts
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { test } from "node:test"

import { parse } from "./resmed.ts"

const fixture = await readFile(new URL("../../fixtures/resmed.html", import.meta.url), "utf8")

test("병원 필드를 읽고 시·도를 약칭으로, 주소에서 우편번호를 뺀다", () => {
  assert.deepEqual(parse(fixture)[0], {
    id: "gangwonnugaent",
    name: "누가이비인후과의원",
    region: "강원",
    address: "강원도 동해시 한섬로 111-7",
    phone: "033-535-3600",
    lat: 37.52221,
    lng: 129.11555,
    sourceUrl: "https://www.resmed.kr/psg-finder/gangwonnugaent",
  })
})

test("전화번호가 비어 있으면 null이다", () => {
  const hospital = parse(fixture).find((h) => h.id === "seoulcheongdament")
  assert.equal(hospital?.phone, null)
  assert.equal(hospital?.address, "서울특별시 강남구 학동로53길 3-2 2층 (논현동)")
})

test("필수 값이 없는 병원과 끝의 템플릿은 건너뛴다", () => {
  assert.deepEqual(
    parse(fixture).map((h) => h.id),
    ["gangwonnugaent", "seoulcheongdament"],
  )
})

test("HTML 엔티티를 풀어 쓴다", () => {
  const html = fixture.replace("누가이비인후과의원</div>", "숨&amp;잠의원</div>")
  assert.equal(parse(html)[0].name, "숨&잠의원")
})

test("알 수 없는 시·도가 나오면 실패한다", () => {
  const html = fixture.replace('"강원도"', '"평양"')
  assert.throws(() => parse(html), /알 수 없는 시·도/)
})
```

- [ ] **3단계: 테스트가 실패하는지 확인한다**

실행: `pnpm --dir crawler test`
기대: `Cannot find module ... resmed.ts`로 실패

- [ ] **4단계: 파서를 구현한다** — `crawler/src/sources/resmed.ts`

```ts
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
```

- [ ] **5단계: 테스트가 통과하는지 확인한다**

실행: `pnpm --dir crawler test`
기대: 5개 통과. "건너뜀: 필수 값이 없습니다 (값이빠진의원)" 경고가 출력된다(정상).

- [ ] **6단계: 소스를 등록하고 최소 건수 검사를 넣는다** — `crawler/src/index.ts` 전체를 아래로 바꾼다

```ts
import { writeFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"

import { crawl as crawlResmed } from "./sources/resmed.ts"

// 수집 대상별 파서는 src/sources/에 두고 여기에 등록한다. 필드 계약은 docs/03-tech-spec.md를 따른다.
type Source = { name: string; crawl: () => Promise<unknown[]> }

const sources: Source[] = [{ name: "레즈메드 병원찾기", crawl: crawlResmed }]

// 대상 페이지 구조가 바뀌면 건수가 크게 줄어든다. 그때는 덮어쓰지 않아 이전 데이터로 서비스가 유지된다.
const MIN_ITEMS = 200

const OUTPUT = fileURLToPath(new URL("../../frontend/src/data/hospitals.json", import.meta.url))

async function main() {
  const items: unknown[] = []
  for (const source of sources) {
    const result = await source.crawl()
    console.log(`${source.name}: ${result.length}건`)
    items.push(...result)
  }

  if (items.length < MIN_ITEMS) {
    throw new Error(`수집 결과가 ${items.length}건으로 ${MIN_ITEMS}건보다 적어 저장하지 않습니다`)
  }

  const data = { crawledAt: new Date().toISOString(), items }
  await writeFile(OUTPUT, JSON.stringify(data, null, 2) + "\n")
  console.log(`저장: ${OUTPUT} (${items.length}건)`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
```

- [ ] **7단계: 실제로 수집한다**

실행: `make crawl`
기대: `레즈메드 병원찾기: 337건` (사이트가 갱신됐다면 근처 값), `저장: .../hospitals.json`

실행: `node -e 'const d=require("./frontend/src/data/hospitals.json"); console.log(d.items.length, new Set(d.items.map(h=>h.id)).size, d.items.filter(h=>!h.phone).length, [...new Set(d.items.map(h=>h.region))].length)'`
기대: `337 337 2 17` (건수, 고유 id 수, 전화번호 없는 병원 수, 시·도 수)

- [ ] **8단계: 크롤러 검사를 돌린다**

실행: `make crawler-check`
기대: 타입 체크와 테스트 통과

- [ ] **9단계: 커밋한다 (메인 세션)**

```bash
git add crawler/fixtures crawler/src frontend/src/data/hospitals.json
git commit -m "feat: crawl the resmed sleep clinic list into hospitals.json"
```

---

### 작업 2: 병원 조회·정렬 함수

**담당:** 메인 세션 (`frontend/src/lib/`는 공통 파일)

**파일:**
- 생성: `frontend/src/lib/hospitals.ts`
- 생성: `frontend/src/lib/hospitals.test.ts`

**인터페이스:**
- 사용: `frontend/src/data/hospitals.json` (작업 1)
- 제공 (작업 3·4가 쓴다):

```ts
const REGIONS: readonly Region[]
type Region, Hospital, HospitalData
type Coords = { lat: number; lng: number }
type HospitalWithDistance = Hospital & { distanceKm: number }
const CLINIC_FINDER_URL: string
getHospitalData(): HospitalData
listRegions(items: Hospital[]): { region: Region; count: number }[]
filterByRegion(items: Hospital[], region: Region | null): Hospital[]
distanceKm(a: Coords, b: Coords): number
sortByDistance(items: Hospital[], origin: Coords): HospitalWithDistance[]
formatDistance(km: number): string
formatCrawledAt(iso: string): string
```

- [ ] **1단계: 실패하는 테스트를 쓴다** — `frontend/src/lib/hospitals.test.ts`

```ts
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
```

- [ ] **2단계: 테스트가 실패하는지 확인한다**

실행: `pnpm --dir frontend exec vitest run src/lib/hospitals.test.ts`
기대: `./hospitals`를 찾지 못해 실패

- [ ] **3단계: 구현한다** — `frontend/src/lib/hospitals.ts`

```ts
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
  sourceUrl: string
}

export type HospitalData = { crawledAt: string; items: Hospital[] }

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

// 지역 순서 → 주소 가나다순. 같은 시·군·구 병원이 모인다. region이 null이면 전체다.
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
```

`filter`가 새 배열을 돌려주므로 뒤의 `sort`는 원본을 바꾸지 않는다.

- [ ] **4단계: 테스트가 통과하는지 확인한다** (작업 1의 `hospitals.json`이 있어야 한다)

실행: `pnpm --dir frontend exec vitest run src/lib/hospitals.test.ts`
기대: 전부 통과

실행: `cd frontend && pnpm exec tsc --noEmit && pnpm lint`
기대: 오류 없음

- [ ] **5단계: 커밋한다**

```bash
git add frontend/src/lib/hospitals.ts frontend/src/lib/hospitals.test.ts
git commit -m "feat: add hospital lookup, region filter, and distance sort"
```

---

### 작업 3: S4 화면 (지역 방식)

**담당:** frontend-implementer. 구현 전에 `DESIGN.md`와 `docs/02-design-pass.md`의 S4를 읽는다.

**파일:**
- 생성: `frontend/src/app/clinics/page.tsx`
- 생성: `frontend/src/components/clinics/clinic-finder.tsx`
- 생성: `frontend/src/components/clinics/clinic-card.tsx`
- 수정: `frontend/src/components/analytics/track.ts` (이벤트 타입)
- 수정: `frontend/src/components/sleep/report-view.tsx` (CTA 링크, 아이콘)
- 수정: `frontend/src/lib/sleep-check.ts` (`CLINIC_FINDER_URL` 한 줄 삭제. 공통 파일이지만 삭제와 한 묶음이라 이 작업에서 한다)
- 삭제: `frontend/src/app/go/clinic/page.tsx` (`go/` 폴더째), `frontend/src/components/sleep/clinic-redirect.tsx`

**인터페이스:**
- 사용 (`@/lib/hospitals`, 작업 2): `getHospitalData()`, `formatCrawledAt(iso)`, `listRegions(items)`, `filterByRegion(items, region)`, `CLINIC_FINDER_URL`, 타입 `Hospital`, `Region`
- 제공 (작업 4가 고친다): `ClinicFinder({ items: Hospital[] })`, `ClinicCard({ hospital: Hospital })`

- [ ] **1단계: 분석 이벤트 타입을 바꾼다** — `frontend/src/components/analytics/track.ts`

```ts
// 바꾸기 전
  | { name: "clinic_click" }

// 바꾼 뒤
  | { name: "clinic_click"; hospital_id: string; region: string }
  | { name: "clinic_call"; hospital_id: string; region: string }
```

`PIXEL_EVENTS`는 그대로 둔다. 메타 픽셀에는 `ClinicClick` 이름만 가고 파라미터는 가지 않는다.

- [ ] **2단계: 병원 카드를 만든다** — `frontend/src/components/clinics/clinic-card.tsx`

```tsx
"use client"

import { ExternalLink, Phone } from "lucide-react"
import { track } from "@/components/analytics/track"
import { buttonVariants } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import type { Hospital } from "@/lib/hospitals"
import { cn } from "cn"

export function ClinicCard({ hospital }: { hospital: Hospital }) {
  const params = { hospital_id: hospital.id, region: hospital.region }

  return (
    <Card className="gap-3 px-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold">{hospital.name}</h2>
        <p className="text-sm text-muted-foreground">{hospital.address}</p>
      </div>
      <div className="flex gap-2">
        {hospital.phone && (
          <a
            href={`tel:${hospital.phone}`}
            onClick={() => track({ name: "clinic_call", ...params })}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "h-11 flex-1 text-base",
            )}
          >
            <Phone data-icon="inline-start" aria-hidden />
            전화하기
          </a>
        )}
        {/* 이 화면의 주요 행동이다. 카드마다 채운 버튼을 두지 않고 글자·테두리 색으로만 강조한다. */}
        <a
          href={hospital.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track({ name: "clinic_click", ...params })}
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-11 flex-1 border-primary text-base text-primary",
          )}
        >
          병원 정보 보기
          <ExternalLink data-icon="inline-end" aria-hidden />
        </a>
      </div>
    </Card>
  )
}
```

- [ ] **3단계: 지역 선택과 목록을 만든다** — `frontend/src/components/clinics/clinic-finder.tsx`

지역 시트는 2열 격자다. "전체" + 17개 시·도가 9줄에 들어가 시트 안에서 스크롤하지 않는다.

```tsx
"use client"

import { useState } from "react"
import { ChevronDown, SearchX } from "lucide-react"
import { ClinicCard } from "@/components/clinics/clinic-card"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  filterByRegion,
  listRegions,
  type Hospital,
  type Region,
} from "@/lib/hospitals"
import { cn } from "cn"

export function ClinicFinder({ items }: { items: Hospital[] }) {
  const [region, setRegion] = useState<Region | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const regions = listRegions(items)
  const visible = filterByRegion(items, region)

  function selectRegion(next: Region | null) {
    setRegion(next)
    setSheetOpen(false)
  }

  return (
    <>
      <Button
        variant="outline"
        className="h-11 w-full justify-between border-primary px-4 text-base text-primary"
        onClick={() => setSheetOpen(true)}
      >
        <span className="tabular-nums">
          {region ?? "전체"} · {visible.length}곳
        </span>
        <ChevronDown data-icon="inline-end" aria-hidden />
      </Button>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>지역 선택</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-2 gap-2 px-4 pb-4">
            <RegionOption
              label="전체"
              count={items.length}
              selected={region === null}
              onSelect={() => selectRegion(null)}
            />
            {regions.map((r) => (
              <RegionOption
                key={r.region}
                label={r.region}
                count={r.count}
                selected={region === r.region}
                onSelect={() => selectRegion(r.region)}
              />
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <SearchX className="size-8 text-muted-foreground" aria-hidden />
          <p className="text-base">이 지역에는 아직 등록된 곳이 없어요</p>
          <Button
            variant="outline"
            className="h-11 px-4 text-base"
            onClick={() => selectRegion(null)}
          >
            전체 보기
          </Button>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {visible.map((hospital) => (
            <li key={hospital.id}>
              <ClinicCard hospital={hospital} />
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

function RegionOption({
  label,
  count,
  selected,
  onSelect,
}: {
  label: string
  count: number
  selected: boolean
  onSelect: () => void
}) {
  return (
    <Button
      variant="outline"
      aria-pressed={selected}
      className={cn(
        "h-11 justify-between px-3 text-base",
        selected && "border-primary text-primary",
      )}
      onClick={onSelect}
    >
      {label}
      <span className="text-sm text-muted-foreground tabular-nums">
        {count}
      </span>
    </Button>
  )
}
```

- [ ] **4단계: 페이지를 만든다** — `frontend/src/app/clinics/page.tsx`

```tsx
import { ExternalLink } from "lucide-react"
import { ClinicFinder } from "@/components/clinics/clinic-finder"
import { buttonVariants } from "@/components/ui/button"
import {
  CLINIC_FINDER_URL,
  formatCrawledAt,
  getHospitalData,
} from "@/lib/hospitals"
import { cn } from "cn"

export const metadata = { title: "근처 수면클리닉" }

export default function ClinicsPage() {
  const { crawledAt, items } = getHospitalData()

  // 수집 데이터가 비었을 때만 원 페이지로 대신 안내한다.
  if (items.length === 0) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-screen-md flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-base">
          병원 목록을 준비하지 못했어요. 레즈메드 병원찾기에서 찾아보세요.
        </p>
        <a
          href={CLINIC_FINDER_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(buttonVariants(), "h-12 px-4 text-base")}
        >
          레즈메드 병원찾기 열기
          <ExternalLink data-icon="inline-end" aria-hidden />
        </a>
      </main>
    )
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-screen-md flex-col gap-4 px-4 pt-6 pb-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">근처 수면클리닉</h1>
        <p className="text-xs text-muted-foreground">
          레즈메드 병원찾기 · {formatCrawledAt(crawledAt)} 수집
        </p>
      </header>
      <ClinicFinder items={items} />
    </main>
  )
}
```

- [ ] **5단계: 리포트 CTA를 바꾼다** — `frontend/src/components/sleep/report-view.tsx`

```tsx
// 바꾸기 전
        <Link
          href="/go/clinic"
          className={cn(buttonVariants(), "h-12 w-full text-base")}
        >
          근처 수면클리닉 찾기
          <ExternalLink data-icon="inline-end" aria-hidden />
        </Link>

// 바꾼 뒤
        <Link
          href="/clinics"
          className={cn(buttonVariants(), "h-12 w-full text-base")}
        >
          근처 수면클리닉 찾기
        </Link>
```

같은 파일 위쪽의 `import { ExternalLink } from "lucide-react"` 줄을 지운다(다른 곳에서 쓰지 않는다).

- [ ] **6단계: 리다이렉트 경로를 지운다**

```bash
git rm -r frontend/src/app/go frontend/src/components/sleep/clinic-redirect.tsx
```

`frontend/src/lib/sleep-check.ts`에서 아래 한 줄을 지운다.

```ts
export const CLINIC_FINDER_URL = "https://www.resmed.kr/psg-finder"
```

실행: `grep -rn "go/clinic\|clinic-redirect\|ClinicRedirect" frontend/src`
기대: 결과 없음

- [ ] **7단계: 검사한다**

실행: `make fe-check`
기대: 타입 체크, 린트, 포맷, 테스트, 빌드 통과. 빌드 출력에 `/clinics`가 정적(○)으로 나온다.

- [ ] **8단계: 화면을 확인한다** (메인 세션, 개발 서버 `frontend`, 375px)

- `/clinics`: 제목, 출처·수집일, "전체 · 337곳", 카드 목록
- 지역 버튼 → 시트 2열, "서울" 선택 → 시트 닫힘, "서울 · 81곳", 강남구부터
- 카드의 병원 정보 보기 `href`가 `https://www.resmed.kr/psg-finder/...`이고 새 탭
- 리포트(`/r#...`) 하단 버튼 → `/clinics`
- 가로 스크롤 없음, 콘솔 오류 없음

- [ ] **9단계: 커밋한다 (메인 세션)**

```bash
git add frontend/src/app/clinics frontend/src/components/clinics frontend/src/components/analytics/track.ts frontend/src/components/sleep/report-view.tsx frontend/src/lib/sleep-check.ts
git commit -m "feat: show the crawled sleep clinic list instead of redirecting to resmed"
```

(6단계의 `git rm`으로 삭제는 이미 스테이징돼 있다.)

---

### 작업 4: 내 주변 순으로 보기

**담당:** frontend-implementer

**파일:**
- 수정: `frontend/src/components/analytics/track.ts`
- 수정: `frontend/src/components/clinics/clinic-card.tsx`
- 수정: `frontend/src/components/clinics/clinic-finder.tsx`

**인터페이스:**
- 사용 (`@/lib/hospitals`, 작업 2): `sortByDistance(items, origin): HospitalWithDistance[]`, `formatDistance(km): string`, 타입 `Coords`
- 제공: `ClinicCard({ hospital: Hospital; distance?: string })`

- [ ] **1단계: 이벤트 타입을 추가한다** — `frontend/src/components/analytics/track.ts`

`clinic_call` 줄 아래에 추가한다. 좌표와 거리는 넣지 않는다.

```ts
  | { name: "clinic_nearby"; result: "granted" | "denied" | "failed" }
```

- [ ] **2단계: 카드에 거리를 붙인다** — `frontend/src/components/clinics/clinic-card.tsx`

```tsx
// 바꾸기 전
export function ClinicCard({ hospital }: { hospital: Hospital }) {

// 바꾼 뒤
export function ClinicCard({
  hospital,
  distance,
}: {
  hospital: Hospital
  distance?: string
}) {
```

```tsx
// 바꾸기 전
        <h2 className="text-base font-semibold">{hospital.name}</h2>

// 바꾼 뒤
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold">{hospital.name}</h2>
          {distance && (
            <span className="shrink-0 text-sm text-muted-foreground tabular-nums">
              {distance}
            </span>
          )}
        </div>
```

- [ ] **3단계: 보기 방식을 넣는다** — `frontend/src/components/clinics/clinic-finder.tsx`의 `ClinicFinder` 함수와 import를 아래로 바꾼다. 같은 파일의 `RegionOption`은 그대로 둔다.

```tsx
"use client"

import { useState } from "react"
import { ChevronDown, LocateFixed, SearchX } from "lucide-react"
import { track } from "@/components/analytics/track"
import { ClinicCard } from "@/components/clinics/clinic-card"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  filterByRegion,
  formatDistance,
  listRegions,
  sortByDistance,
  type Coords,
  type Hospital,
  type Region,
} from "@/lib/hospitals"
import { cn } from "cn"

// 지역으로 보거나 내 주변 순으로 본다. 둘을 조합하지 않는다.
type View =
  | { kind: "region"; region: Region | null }
  | { kind: "nearby"; origin: Coords }

const LOCATION_MESSAGES = {
  denied: "위치 권한이 꺼져 있어요. 지역을 골라 주세요",
  failed: "위치를 확인할 수 없어요. 지역을 골라 주세요",
}

export function ClinicFinder({ items }: { items: Hospital[] }) {
  const [view, setView] = useState<View>({ kind: "region", region: null })
  const [sheetOpen, setSheetOpen] = useState(false)
  const [locating, setLocating] = useState(false)
  const [locationError, setLocationError] = useState<
    keyof typeof LOCATION_MESSAGES | null
  >(null)

  const regions = listRegions(items)
  const selectedRegion = view.kind === "region" ? view.region : null
  const byRegion = filterByRegion(items, selectedRegion)

  function selectRegion(next: Region | null) {
    setView({ kind: "region", region: next })
    setLocationError(null)
    setSheetOpen(false)
  }

  function failLocation(result: keyof typeof LOCATION_MESSAGES) {
    setLocating(false)
    setLocationError(result)
    track({ name: "clinic_nearby", result })
  }

  // 권한은 사용자가 이 버튼을 눌렀을 때만 요청한다. 좌표는 거리 계산에만 쓰고 보내지 않는다.
  function requestNearby() {
    if (!("geolocation" in navigator)) {
      failLocation("failed")
      return
    }
    setLocating(true)
    setLocationError(null)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false)
        setView({
          kind: "nearby",
          origin: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          },
        })
        track({ name: "clinic_nearby", result: "granted" })
      },
      (error) =>
        failLocation(
          error.code === error.PERMISSION_DENIED ? "denied" : "failed",
        ),
      { enableHighAccuracy: false, timeout: 10000 },
    )
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <Button
            variant="outline"
            className={cn(
              "h-11 min-w-0 flex-1 justify-between px-3 text-base",
              view.kind === "region" && "border-primary text-primary",
            )}
            onClick={() => setSheetOpen(true)}
          >
            <span className="truncate tabular-nums">
              {view.kind === "region"
                ? `${view.region ?? "전체"} · ${byRegion.length}곳`
                : "지역 선택"}
            </span>
            <ChevronDown data-icon="inline-end" aria-hidden />
          </Button>
          <Button
            variant="outline"
            disabled={locating}
            aria-pressed={view.kind === "nearby"}
            className={cn(
              "h-11 shrink-0 px-3 text-base",
              view.kind === "nearby" && "border-primary text-primary",
            )}
            onClick={requestNearby}
          >
            <LocateFixed data-icon="inline-start" aria-hidden />
            {locating ? "위치 확인 중…" : "내 주변 순으로 보기"}
          </Button>
        </div>
        {locationError && (
          <p role="alert" className="text-sm text-muted-foreground">
            {LOCATION_MESSAGES[locationError]}
          </p>
        )}
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>지역 선택</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-2 gap-2 px-4 pb-4">
            <RegionOption
              label="전체"
              count={items.length}
              selected={view.kind === "region" && view.region === null}
              onSelect={() => selectRegion(null)}
            />
            {regions.map((r) => (
              <RegionOption
                key={r.region}
                label={r.region}
                count={r.count}
                selected={view.kind === "region" && view.region === r.region}
                onSelect={() => selectRegion(r.region)}
              />
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {view.kind === "nearby" ? (
        <ul className="flex flex-col gap-3">
          {sortByDistance(items, view.origin).map((hospital) => (
            <li key={hospital.id}>
              <ClinicCard
                hospital={hospital}
                distance={formatDistance(hospital.distanceKm)}
              />
            </li>
          ))}
        </ul>
      ) : byRegion.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <SearchX className="size-8 text-muted-foreground" aria-hidden />
          <p className="text-base">이 지역에는 아직 등록된 곳이 없어요</p>
          <Button
            variant="outline"
            className="h-11 px-4 text-base"
            onClick={() => selectRegion(null)}
          >
            전체 보기
          </Button>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {byRegion.map((hospital) => (
            <li key={hospital.id}>
              <ClinicCard hospital={hospital} />
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
```

- [ ] **4단계: 검사한다**

실행: `make fe-check`
기대: 전부 통과

- [ ] **5단계: 화면을 확인한다** (메인 세션, 개발 서버, 375px)

- 들어왔을 때 권한 창이 뜨지 않는다
- 두 버튼이 한 줄에 들어가고 가로 스크롤이 없다
- 내 주변 버튼 → 허용: 버튼이 노랑 테두리, 지역 버튼은 "지역 선택", 카드에 거리, 가까운 순
- 브라우저에서 위치를 차단하고 다시: "위치 권한이 꺼져 있어요. 지역을 골라 주세요", 목록은 그대로
- 내 주변 방식에서 "서울"을 고르면 거리가 사라지고 "서울 · 81곳"

- [ ] **6단계: 커밋한다 (메인 세션)**

```bash
git add frontend/src/components/clinics frontend/src/components/analytics/track.ts
git commit -m "feat: sort sleep clinics by distance when the user asks for nearby"
```

---

### 작업 5: 검증

**담당:** 메인 세션이 `/gate`를 실행한다. 판정은 verifier와 design-reviewer 서브에이전트가 한다(구현한 세션과 다른 컨텍스트).

- [ ] **1단계:** `/gate` 실행 → `make gate` 통과 후 개발 서버를 띄우고 verifier, design-reviewer를 병렬로 돌린다. 기준은 `docs/05-verification.md`의 V1~V11이다.
- [ ] **2단계:** verifier가 "QA 필요"로 넘긴 항목(V4~V11)은 gstack `/qa`로 브라우저에서 확인한다.
- [ ] **3단계:** V12(인스타그램 인앱 브라우저)는 배포 뒤 사용자가 실제 기기로 확인한다. 결과를 받아 적는다.
- [ ] **4단계:** 결과를 `docs/05-verification.md`의 "결과"에 기록한다. 겪은 문제는 `docs/troubleshooting.md`에 남긴다.
- [ ] **5단계:** FAIL이 있으면 해당 작업 단위로 돌아가 고치고 다시 검증한다. 전부 PASS면 사용자에게 최종 확인을 받는다.
- [ ] **6단계:** 확인을 받으면 개발 서버를 끄고 커밋·푸시한다.

```bash
git add docs/05-verification.md docs/troubleshooting.md
git commit -m "docs: record sleep clinic list verification results"
git push
```
