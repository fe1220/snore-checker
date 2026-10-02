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

---

## 검증 후 수정 (1차 검증에서 나온 것)

[05-verification](05-verification.md#체크리스트-밖에서-발견한-것)의 F1·F2·F3·F5다. F4(320px)와 새 접근성 기준은 전 화면 접근성 작업에서 함께 한다.

| # | 작업 | 담당 | 소유 파일 | 의존 |
|---|---|---|---|---|
| 6 | 지역번호 없는 전화번호에 지역번호 붙이기 (F1) | data-implementer | `crawler/`, `frontend/src/data/` | - |
| 7a | `groupByRegion` 추가 | 메인 | `frontend/src/lib/hospitals*.ts` | - |
| 7b | 긴 병원명 줄바꿈(F2), 시트 닫기 버튼(F3), "전체" 보기 시·도 소제목(F5) | frontend-implementer | `frontend/src/components/clinics/` | 7a |

### 작업 6: 지역번호 붙이기

- `crawler/src/sources/resmed.ts`: 시·도별 지역번호 표(서울 02, 경기 031, 인천 032, 부산 051, 대구 053, 광주 062, 대전 042, 울산 052, 세종 044, 강원 033, 충북 043, 충남 041, 전북 063, 전남 061, 경북 054, 경남 055, 제주 064)를 두고, 전화번호가 `/^\d{3,4}-\d{4}$/`이면서 `/^1\d{3}-/`(대표번호)이 아니면 `{지역번호}-{번호}`로 바꾼다. 그 밖의 번호는 그대로 둔다.
- 테스트(`resmed.test.ts`): 지역번호 없는 번호 → 붙음, 대표번호 `1577-0083` → 그대로, 이미 지역번호가 있는 번호 → 그대로, `0507-` 번호 → 그대로.
- `make crawl`로 다시 수집한다. 기대: 지역번호 없는 번호 0건, 전화번호 없음 2건, 337건.
- 커밋: `fix: add the area code to clinic phone numbers that lack one`

### 작업 7: 화면 수정

- 7a `groupByRegion(items): { region: Region; items: Hospital[] }[]` — 병원이 있는 지역만 정해진 순서로, 지역 안은 주소 가나다순. vitest 추가.
- 7b
  - `clinic-card.tsx`: 병원명 `h2`에 `min-w-0 [overflow-wrap:anywhere]`. 360px에서 `busancoent` 카드의 제목과 거리가 카드 안에 들어오는지 확인한다.
  - `clinic-finder.tsx`: `SheetContent`에 `showCloseButton={false}`, 시트 머리말 오른쪽에 `aria-label="닫기"`인 `size-11` ghost 버튼(lucide `X`). `components/ui/sheet.tsx`는 고치지 않는다.
  - `clinic-finder.tsx`: 지역 방식이고 지역이 "전체"일 때만 `groupByRegion`으로 묶어 지역마다 소제목 `h2`("서울" + 보조색 "81곳", `text-lg font-semibold`)와 그 아래 카드 목록을 그린다. 이때 카드 제목은 소제목 아래 단계가 되도록 `ClinicCard`에 `headingLevel`을 두지 않고, 소제목이 있는 보기에서도 카드 제목 태그는 그대로 둔다(보기마다 태그가 달라지지 않게).
- 커밋: `fix: wrap long clinic names, label the sheet close button, and group the full list by region`
- 끝나면 `make gate`와 05의 V5~V9를 다시 확인하고 05에 2차 결과를 적는다.

---

# 구현 계획 2: 40~60대 접근성과 쉬운 문구

상태: 승인

> **에이전트용:** superpowers:subagent-driven-development로 작업 단위별로 실행한다. 단계는 체크박스(`- [ ]`)로 추적한다.

**목표:** S1~S4와 처리방침의 글자·터치 영역·대비·확대 대응을 40~60대 기준에 맞추고, 문구 감사에서 나온 수정 35건과 빠진 화면(없는 주소, 오류, 처리방침 링크)을 채운다.

**구조:** 먼저 브라우저에서 기준을 재는 Playwright 스크립트를 만든다(지금 화면에서는 실패한다). 그다음 공통 토큰과 `lib` 문구를 고치고, 화면 세 묶음을 병렬로 고쳐 스크립트를 통과시킨다. 마지막에 스크립트를 `make gate`에 넣는다.

**스택:** Next.js App Router, Tailwind v4, shadcn/ui(base-ui), vitest. 새 개발 의존성: `@playwright/test`, `@axe-core/playwright`.

**스펙:** [02-design-pass 접근성](02-design-pass.md#접근성-4060대-기준), [03-tech-spec 추가 1](03-tech-spec.md#추가-1-접근성-기준과-문구-적용), [DESIGN.md](../DESIGN.md) 4·5·9절, [copy-audit](01-research/copy-audit.md)

## 공통 제약

- 읽는 글자는 16px 이상, 본문은 18px(`text-lg`). `text-sm`·`text-xs`를 쓰지 않는다.
- 터치 영역은 48px 이상, 주요 버튼은 56px. 터치 영역 사이는 8px 이상.
- 글자가 든 요소는 `h-*` 대신 `min-h-*`를 쓴다. `truncate`·`line-clamp`를 쓰지 않는다.
- 글자 대비 7:1 이상, 테두리 3:1 이상. 원시 색상값을 쓰지 않는다.
- `src/components/ui/*`는 고치지 않는다. 쓰는 쪽에서 `className`으로 덮어쓴다.
- 화면 구조, 정보 위계, 판정 규칙, 분석 이벤트는 바꾸지 않는다.
- 문구는 이 계획에 적힌 것만 바꾼다. [copy-audit](01-research/copy-audit.md)의 "검토" 11건(27, 36, 79, 88, 92, 109, 117, 118, 121, 135, 141)은 건드리지 않는다.
- 코 고는 사람은 "남편"이라고 부른다. 광고 소재가 모두 "남편"이라 들어온 사람에게 가장 분명하다. "배우자"는 답하는 사람인지 코 고는 사람인지 헷갈려 화면 문구에 쓰지 않는다.
- `report.tsx`는 이 계획을 쓰는 동안에도 사용자가 고치고 있었다. 아래 "지금 문구"가 파일에 없으면 그 줄은 건너뛰고 보고한다. 추측으로 다른 문장을 바꾸지 않는다.
- 작업 단위마다 커밋 1개. 푸시는 작업 6이 끝나고 `make gate`가 통과한 뒤 한 번만 한다.

## 작업 단위와 순서

| # | 작업 | 담당 | 소유 파일 | 의존 |
|---|---|---|---|---|
| 0 | 검증 기준 작성 | 메인 | `docs/05-verification.md` | - |
| 1 | 측정 스크립트 | 메인 | `frontend/e2e/`, `frontend/playwright.config.ts`, `frontend/package.json`, `Makefile`, `.gitignore` | 0 |
| 2 | 공통: 토큰, `lib` 문구, 없는 주소·오류 화면, 용어표 | 메인 | `frontend/src/app/globals.css`, `frontend/src/lib/sleep-check.ts`, `frontend/src/app/not-found.tsx`, `frontend/src/app/error.tsx`, `frontend/src/app/layout.tsx`, `DESIGN.md` | 1 |
| 3 | S1 체크 시작, S2 체크 | frontend-implementer | `frontend/src/components/sleep/landing.tsx`, `check-flow.tsx` | 2 |
| 4 | S3 리포트, 공유 미리보기 | frontend-implementer | `frontend/src/components/sleep/report.tsx`, `report-view.tsx`, `share-button.tsx`, `frontend/src/app/r/page.tsx`, `frontend/src/app/opengraph-image.tsx` | 2 |
| 5 | S4 근처 수면클리닉, 처리방침 | frontend-implementer | `frontend/src/components/clinics/*`, `frontend/src/app/clinics/page.tsx`, `frontend/src/app/privacy/page.tsx` | 2 |
| 6 | 게이트 편입, 스크린샷, 검증 | 메인 | `Makefile`, `.github/workflows/gate.yml`, `docs/05-verification.md`, `docs/05-verification/a11y/` | 3, 4, 5 |

작업 3·4·5는 파일이 겹치지 않아 병렬로 돌린다.

### 작업 0: 검증 기준 작성

**파일:** 수정 `docs/05-verification.md`

- [ ] **1단계: 체크리스트 추가.** 파일 끝에 아래를 붙인다.

```markdown
## 체크리스트: 접근성과 문구

기준 문서: [02-design-pass 접근성](02-design-pass.md#접근성-4060대-기준), [03-tech-spec 추가 1](03-tech-spec.md#추가-1-접근성-기준과-문구-적용)

### 자동 (`make fe-a11y`, 화면 11개 × 검사 6개)

- [ ] A1 보이는 글자가 모두 16px 이상이다
- [ ] A2 버튼·링크·선택지가 모두 48×48px 이상이다
- [ ] A3 터치 영역 사이가 8px 이상이다
- [ ] A4 글자 대비가 7:1 이상이다 (axe `color-contrast-enhanced`)
- [ ] A5 폭 320px에서 가로 스크롤이 없다
- [ ] A6 글자만 130%·200%로 키워도 가로 스크롤이 없고, 버튼 글자가 버튼 밖으로 나가지 않는다
- [ ] A7 `grep -rnE "text-(xs|sm)\b|truncate|line-clamp" frontend/src/app frontend/src/components/sleep frontend/src/components/clinics` 결과가 없다

### 브라우저

- [ ] A8 없는 주소(`/nope`)에서 한국어 안내와 "처음으로 가기"가 나온다
- [ ] A9 체크 시작 화면과 리포트 아래에서 개인정보처리방침으로 갈 수 있다
- [ ] A10 리포트에서 판정 단계, 주요 신호가 색 없이(흑백 스크린샷)도 구분된다
- [ ] A11 기기 설정에서 "동작 줄이기"를 켜면 문항 전환과 시트 전환 효과가 없다
- [ ] A12 폭 320·375 × 글자 100·130·200% 스크린샷에서 겹침·잘림이 없다 (`docs/05-verification/a11y/`)
- [ ] A13 실제 휴대폰(안드로이드 글자 크기 "크게", 아이폰)에서 S1~S4를 끝까지 간다 (사용자가 확인)

### 문구

- [ ] A14 서비스 이름이 모든 화면에서 "코골이 체크"다 (`grep -rn "코골이체커" frontend/src` 결과 없음)
- [ ] A15 [copy-audit](01-research/copy-audit.md)의 수정 35건이 반영됐거나, 건너뛴 이유가 결과에 적혀 있다
```

- [ ] **2단계: 커밋**

```bash
git add docs/05-verification.md
git commit -m "docs: add verification criteria for accessibility and copy"
```

### 작업 1: 측정 스크립트

**파일:**
- 생성 `frontend/playwright.config.ts`, `frontend/e2e/a11y.spec.ts`
- 수정 `frontend/package.json`, `Makefile`, `.gitignore`

**제공하는 것:** `make fe-a11y` (작업 3~6이 쓴다). 실패하면 화면 이름, 검사 이름, 위반 요소의 글자와 값을 출력한다.

- [ ] **1단계: 의존성 설치**

```bash
pnpm --dir frontend add -D @playwright/test @axe-core/playwright
pnpm --dir frontend exec playwright install chromium
```

- [ ] **2단계: 설정 파일.** `frontend/playwright.config.ts`

```ts
import { defineConfig } from "@playwright/test"

// 빌드된 결과를 띄워서 잰다. 개발 서버는 오버레이가 끼어 측정이 달라진다.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3100",
    viewport: { width: 375, height: 812 },
    locale: "ko-KR",
  },
  webServer: {
    command: "pnpm exec next start -p 3100",
    url: "http://localhost:3100",
    reuseExistingServer: false,
  },
})
```

- [ ] **3단계: 측정 스크립트.** `frontend/e2e/a11y.spec.ts`

```ts
import AxeBuilder from "@axe-core/playwright"
import { expect, test, type Page } from "@playwright/test"

// 리포트 해시: 문항 9개 전부(e7), 약한 신호 3개(3n), 신호 없음(0). lib/sleep-check.ts의 비트 순서를 따른다.
const SCREENS: { name: string; path: string; open?: string; answer?: string }[] = [
  { name: "s1-start", path: "/" },
  { name: "s2-check", path: "/check" },
  // 2번 질문부터 뒤로 가기 버튼이 생긴다.
  { name: "s2-check-back", path: "/check", answer: "아니요" },
  { name: "s3-strong", path: "/r#v1-e7" },
  { name: "s3-moderate", path: "/r#v1-3n" },
  { name: "s3-weak", path: "/r#v1-0" },
  { name: "s3-shared", path: "/r?shared=1#v1-e7" },
  { name: "s4-clinics", path: "/clinics" },
  { name: "s4-regions", path: "/clinics", open: "전국 ·" },
  { name: "privacy", path: "/privacy" },
  { name: "not-found", path: "/nope" },
]

const MIN_FONT = 16
const MIN_TARGET = 48
const MIN_GAP = 8

async function open(page: Page, screen: (typeof SCREENS)[number]) {
  await page.goto(screen.path)
  await page.waitForLoadState("networkidle")
  if (screen.answer) {
    await page.getByRole("button", { name: screen.answer, exact: true }).click()
    await page.getByRole("button", { name: /이전 질문/ }).waitFor()
  }
  if (screen.open) {
    await page.getByRole("button", { name: new RegExp(screen.open) }).click()
    await page.getByRole("dialog").waitFor()
  }
}

// 글자만 키운다(안드로이드 글꼴 배율과 같다). 여백과 고정 높이는 그대로라 넘침이 드러난다.
async function scaleText(page: Page, scale: number) {
  await page.evaluate((s) => {
    const all = [...document.querySelectorAll<HTMLElement>("body *")]
    const sizes = all.map((el) => parseFloat(getComputedStyle(el).fontSize))
    all.forEach((el, i) => (el.style.fontSize = `${sizes[i] * s}px`))
  }, scale)
}

function smallText(page: Page, min: number) {
  return page.evaluate((minSize) => {
    const found: string[] = []
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node.textContent?.trim()
      const el = node.parentElement
      if (!text || !el) continue
      if (el.closest("script, style, noscript, [aria-hidden='true']")) continue
      const rect = el.getBoundingClientRect()
      const style = getComputedStyle(el)
      if (rect.width <= 1 || rect.height <= 1 || style.visibility === "hidden")
        continue
      const size = parseFloat(style.fontSize)
      if (size < minSize) found.push(`${size}px "${text.slice(0, 30)}"`)
    }
    return found
  }, min)
}

// 문장 안의 글자 링크(display: inline)는 터치 영역 검사에서 뺀다.
function targets(page: Page) {
  return page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>("a[href], button, [role='button']")]
      .filter((el) => {
        const rect = el.getBoundingClientRect()
        const style = getComputedStyle(el)
        return (
          rect.width > 0 &&
          rect.height > 0 &&
          style.visibility !== "hidden" &&
          style.display !== "inline"
        )
      })
      .map((el) => {
        const rect = el.getBoundingClientRect()
        const range = document.createRange()
        range.selectNodeContents(el)
        const inner = range.getBoundingClientRect()
        return {
          label: (el.getAttribute("aria-label") ?? el.innerText).trim().slice(0, 30),
          x: rect.left,
          y: rect.top,
          w: rect.width,
          h: rect.height,
          spill:
            inner.width > 0 &&
            (inner.left < rect.left - 1 ||
              inner.right > rect.right + 1 ||
              inner.top < rect.top - 1 ||
              inner.bottom > rect.bottom + 1),
        }
      }),
  )
}

type Target = Awaited<ReturnType<typeof targets>>[number]

function tooClose(list: Target[]) {
  const found: string[] = []
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i]
      const b = list[j]
      const gapX = Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w))
      const gapY = Math.max(b.y - (a.y + a.h), a.y - (b.y + b.h))
      const sameRow = gapY < 0 && gapX >= 0 && gapX < MIN_GAP
      const sameColumn = gapX < 0 && gapY >= 0 && gapY < MIN_GAP
      if (sameRow || sameColumn)
        found.push(`"${a.label}" ↔ "${b.label}" ${Math.max(gapX, gapY)}px`)
    }
  }
  return found
}

function hasHorizontalScroll(page: Page) {
  return page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  )
}

for (const screen of SCREENS) {
  test.describe(screen.name, () => {
    test("글자가 16px 이상이다", async ({ page }) => {
      await open(page, screen)
      expect(await smallText(page, MIN_FONT)).toEqual([])
    })

    test("터치 영역이 48px 이상이고 8px 이상 떨어져 있다", async ({ page }) => {
      await open(page, screen)
      const list = await targets(page)
      const small = list
        .filter((t) => t.w < MIN_TARGET || t.h < MIN_TARGET)
        .map((t) => `"${t.label}" ${Math.round(t.w)}×${Math.round(t.h)}`)
      expect(small).toEqual([])
      expect(tooClose(list)).toEqual([])
    })

    test("글자 대비가 7:1 이상이다", async ({ page }) => {
      await open(page, screen)
      const result = await new AxeBuilder({ page })
        .withRules(["color-contrast-enhanced"])
        .analyze()
      const found = result.violations.flatMap((v) =>
        v.nodes.map((n) => `${n.target.join(" ")}: ${n.failureSummary}`),
      )
      expect(found).toEqual([])
    })

    test("폭 320px에서 가로 스크롤이 없다", async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 700 })
      await open(page, screen)
      expect(await hasHorizontalScroll(page)).toBe(false)
    })

    for (const scale of [1.3, 2]) {
      test(`글자 ${scale * 100}%에서 넘치지 않는다`, async ({ page }) => {
        await open(page, screen)
        await scaleText(page, scale)
        expect(await hasHorizontalScroll(page)).toBe(false)
        const spilled = (await targets(page))
          .filter((t) => t.spill)
          .map((t) => t.label)
        expect(spilled).toEqual([])
      })
    }
  })
}

// A11Y_SHOTS=1일 때만 스크린샷을 남긴다. 검증 문서에 붙이는 용도다.
test.describe("스크린샷", () => {
  test.skip(!process.env.A11Y_SHOTS, "A11Y_SHOTS=1일 때만 실행")
  for (const screen of SCREENS) {
    for (const width of [320, 375]) {
      for (const scale of [1, 1.3, 2]) {
        test(`${screen.name} ${width}px ${scale * 100}%`, async ({ page }) => {
          await page.setViewportSize({ width, height: 812 })
          await open(page, screen)
          if (scale !== 1) await scaleText(page, scale)
          await page.screenshot({
            path: `../docs/05-verification/a11y/${screen.name}-${width}-${scale * 100}.png`,
            fullPage: !screen.name.startsWith("s4"),
          })
        })
      }
    }
  }
})
```

- [ ] **4단계: 실행 명령.** `frontend/package.json`의 `scripts`에 추가한다.

```json
"a11y": "playwright test"
```

`Makefile`에 추가한다(`.PHONY`에도 `fe-a11y`를 넣는다). 아직 `gate`에는 넣지 않는다.

```make
fe-a11y: ## 빌드된 화면에서 글자 크기·터치 영역·대비·확대를 잰다
	cd $(FE) && pnpm build && pnpm a11y
```

`.gitignore`에 추가한다.

```
frontend/test-results/
frontend/playwright-report/
```

`frontend/vitest.config.mts`의 `include`가 `src/**/*.test.ts`라 `e2e/`는 vitest에 잡히지 않는다. 고치지 않는다.

- [ ] **5단계: 실패하는지 확인**

```bash
make fe-a11y
```

기대: 실패. `s3-strong 글자가 16px 이상이다`에 `12px "수면 체크 리포트 …"`, `s2-check 터치 영역…`에 `"이전 질문" 36×36`, `not-found`는 영어 기본 화면이라 통과하거나 대비에서 실패한다. 스크립트 자체의 오류(선택자 못 찾음, 서버 안 뜸)로 실패하면 그것부터 고친다. 실패 목록을 작업 3~5의 구현자에게 넘길 수 있게 저장한다.

```bash
make fe-a11y > /tmp/a11y-before.txt 2>&1 || true
```

- [ ] **6단계: 타입·린트·포맷 확인 후 커밋**

```bash
cd frontend && pnpm exec tsc --noEmit && pnpm lint && pnpm format && cd ..
git add frontend/playwright.config.ts frontend/e2e frontend/package.json frontend/pnpm-lock.yaml Makefile .gitignore
git commit -m "test: add a browser check for text size, tap targets, contrast, and text scaling"
```

### 작업 2: 공통 토큰, `lib` 문구, 빠진 화면

**파일:**
- 수정 `frontend/src/app/globals.css`, `frontend/src/lib/sleep-check.ts`, `frontend/src/app/layout.tsx`, `DESIGN.md`
- 생성 `frontend/src/app/not-found.tsx`, `frontend/src/app/error.tsx`

**제공하는 것:** 작업 3~5가 쓰는 토큰 값. 클래스 이름은 그대로다.

- [ ] **1단계: 토큰.** `globals.css`의 `:root`에서 아래 값만 바꾼다. 대비는 토큰을 sRGB로 바꿔 계산했다(괄호 안은 카드 위 대비).

| 토큰 | 지금 | 바꿀 값 |
|---|---|---|
| `--muted-foreground` | `oklch(0.755 0.038 277)` (6.1) | `oklch(0.82 0.038 277)` (7.6) |
| `--warning` | `oklch(0.741 0.133 38)` (5.5) | `oklch(0.84 0.133 38)` (7.3) |
| `--chart-2` | `oklch(0.741 0.133 38)` | `oklch(0.84 0.133 38)` |
| `--chart-3` | `oklch(0.755 0.038 277)` | `oklch(0.82 0.038 277)` |
| `--destructive` | `oklch(0.704 0.191 22.216)` (4.6) | `oklch(0.82 0.11 22.216)` (7.2) |
| `--border` | `oklch(0.981 0.018 81 / 14%)` (2.6) | `oklch(0.981 0.018 81 / 20%)` (3.3) |
| `--sidebar-border` | `oklch(0.981 0.018 81 / 14%)` | `oklch(0.981 0.018 81 / 20%)` |

- [ ] **2단계: 동작 줄이기.** `globals.css`의 `@layer base` 안, `h1, h2` 규칙 뒤에 추가한다.

```css
  /* "동작 줄이기"를 켠 사람에게는 전환 효과를 보여주지 않는다. */
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
```

- [ ] **3단계: 체크 문항과 판정 문구.** `frontend/src/lib/sleep-check.ts`

| 위치 | 지금 | 바꿀 문구 | 감사 번호 |
|---|---|---|---|
| `QUESTIONS` `pressure` | 고혈압이 있어요 | 남편에게 고혈압이 있어요 | 21 |
| `QUESTIONS` `age` | 50세 이상이에요 | 남편이 50세 이상이에요 | 22 |
| `QUESTIONS` `body` | 최근 몇 년 사이 체중이 늘었어요 | 남편이 최근 몇 년 사이 체중이 늘었어요 | 23 |
| `LEVEL_COPY.weak.body` | 그래도 걱정된다면 상담은 언제든 괜찮아요. | 그래도 걱정되면 언제든 상담받아 보세요. | 46 |

문항의 `id`와 순서는 그대로라 리포트 해시 버전(`v1`)을 올리지 않는다. `sleep-check.test.ts`는 문구를 검사하지 않아 고칠 것이 없다.

- [ ] **4단계: 없는 주소 화면.** `frontend/src/app/not-found.tsx`

```tsx
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "cn"

export const metadata = { title: "페이지를 찾을 수 없어요" }

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-screen-md flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-bold">페이지를 찾을 수 없어요</h1>
      <p className="text-lg text-muted-foreground">
        주소가 바뀌었거나 잘못 들어왔어요.
      </p>
      <Link
        href="/"
        className={cn(buttonVariants(), "min-h-14 px-6 text-lg whitespace-normal")}
      >
        처음으로 가기
      </Link>
    </main>
  )
}
```

- [ ] **5단계: 오류 화면.** `frontend/src/app/error.tsx`

```tsx
"use client"

import { Button } from "@/components/ui/button"

export default function ErrorPage({ retry }: { retry: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-screen-md flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-bold">문제가 생겼어요</h1>
      <p className="text-lg text-muted-foreground">
        잠시 뒤에 다시 눌러 주세요.
      </p>
      <Button
        className="min-h-14 px-6 text-lg whitespace-normal"
        onClick={() => retry()}
      >
        다시 시도
      </Button>
    </main>
  )
}
```

- [ ] **6단계: 서비스 이름.** `layout.tsx`의 `title: "코골이 체크"`는 그대로 둔다(이 이름으로 통일한다). 고칠 것이 없으면 건너뛴다.

- [ ] **7단계: 용어표.** `DESIGN.md` 1절 원칙 5 아래에 추가한다.

```markdown
**용어** (화면마다 같은 말을 쓴다)

| 대상 | 쓰는 말 | 쓰지 않는 말 |
|---|---|---|
| 서비스 이름 | 코골이 체크 | 코골이체커 |
| 병 | 수면무호흡증 | 수면무호흡 |
| 병원에서 받는 검사 | 수면검사 (정식 이름 "수면다원검사"는 검사 단계 설명에서 괄호로 한 번) | 수면무호흡 검사 |
| 우리 서비스에서 하는 것 | 무료진단 (광고 소재와 같은 말). 리포트에는 "이 리포트는 진단이 아니에요"를 반드시 둔다 | 검사 |
| 묻는 것 / "네"라고 답한 것 | 질문 / 신호 | 문항, 항목 |
| 답 | 답 | 응답 |
| 코 고는 사람 | 남편 (공유받은 리포트에서는 "당신") | 배우자, 본인, 옆 사람 |
| 답하는 사람 | 부르지 않는다. 필요하면 "옆에서 본", "함께 자는 사람" | 배우자 |
| 찾는 곳 / 카드 하나 | 수면클리닉 / 병원 | |
| 심한 정도 | 심한 경우 (출처 줄만 의학 용어) | 중증, 중등도 |
```

- [ ] **8단계: 확인과 커밋**

```bash
make fe-check
git add frontend/src/app/globals.css frontend/src/lib/sleep-check.ts frontend/src/app/not-found.tsx frontend/src/app/error.tsx DESIGN.md
git commit -m "feat: raise contrast tokens, honor reduced motion, and add not-found and error screens"
```

### 작업 3: S1 체크 시작, S2 체크

**파일:** 수정 `frontend/src/components/sleep/landing.tsx`, `frontend/src/components/sleep/check-flow.tsx`

**쓰는 것:** 작업 2의 토큰. `make fe-a11y`의 `s1-start`, `s2-check`, `s2-check-back`.

- [ ] **1단계: 지금 실패하는 항목 확인**

```bash
cd frontend && pnpm build && pnpm exec playwright test -g "s1-start|s2-check"
```

- [ ] **2단계: `landing.tsx`**

| 위치 | 지금 | 바꿀 것 |
|---|---|---|
| 브랜드 라벨 | `text-sm font-semibold text-muted-foreground`, "코골이체커" | `text-base font-semibold text-muted-foreground`, "코골이 체크" (3) |
| 보조 문구 | 숨이 멈추는 코골이는 치료로 나아질 수 있는 병일 수 있어요 | 숨이 멈추는 코골이는 병일 수 있어요. 치료하면 나아질 수 있어요 (7) |
| `POINTS[1]` | 수면무호흡 검사는 건강보험이 돼요 | 수면검사는 건강보험이 돼요 (9) |
| `POINTS` 항목 | `py-3 text-base` | `py-3 text-lg` |
| 주요 버튼 | `h-12 w-full text-base` | `min-h-14 w-full py-2 text-lg whitespace-normal` |
| 고정 바 | 버튼만 있음 | 버튼 아래에 처리방침 링크 추가 (아래 코드) |

고정 바는 이렇게 된다.

```tsx
<div className="sticky bottom-0 flex flex-col gap-2 border-t bg-background p-4">
  <Link
    href={`/check?from=${headline}`}
    className={cn(
      buttonVariants(),
      "min-h-14 w-full py-2 text-lg whitespace-normal",
    )}
  >
    지금 바로 3분 체크하기
  </Link>
  <Link
    href="/privacy"
    className="flex min-h-12 items-center justify-center text-base text-muted-foreground underline underline-offset-4"
  >
    개인정보처리방침 보기
  </Link>
</div>
```

- [ ] **3단계: `check-flow.tsx`**

| 위치 | 지금 | 바꿀 것 |
|---|---|---|
| 뒤로 가기 | `size="icon-lg"`, `aria-label="이전 질문"`, 아이콘 `size-5` | `size="icon-lg"` 유지 + `className="size-12"`, `aria-label="이전 질문으로 가기"` (13), 아이콘 `size-6` |
| 머리 영역 | `flex h-14 items-center` | `flex min-h-14 items-center` |
| 진행 막대 | `role="progressbar"`에 이름 없음 | `aria-label="진행 상황"` 추가 |
| 안내 문구 | `mt-6 text-sm text-muted-foreground tabular-nums`, "옆에서 본 대로 답해 주세요" | `mt-6 text-base text-muted-foreground tabular-nums`, "남편을 옆에서 본 대로 답해 주세요" |
| 선택지 | `h-14 w-full justify-start px-4 text-base` | `h-auto min-h-14 w-full justify-start px-4 py-3 text-left text-lg whitespace-normal` |

전환 효과의 `motion-reduce:animate-none`은 그대로 둔다.

- [ ] **4단계: 통과 확인**

```bash
cd frontend && pnpm build && pnpm exec playwright test -g "s1-start|s2-check"
```

기대: 세 화면의 6개 검사가 모두 통과. 실패가 남으면 출력된 요소를 고친다. 글자 200%에서 버튼 글자가 넘치면 그 버튼에 `h-auto`와 `whitespace-normal`이 있는지 본다.

- [ ] **5단계: 정적 검사와 커밋**

```bash
cd frontend && pnpm exec tsc --noEmit && pnpm lint && pnpm format:check && cd ..
git add frontend/src/components/sleep/landing.tsx frontend/src/components/sleep/check-flow.tsx
git commit -m "feat: enlarge text and tap targets on the start and check screens"
```

### 작업 4: S3 리포트, 공유 미리보기

**파일:** 수정 `frontend/src/components/sleep/report.tsx`, `report-view.tsx`, `share-button.tsx`, `frontend/src/app/r/page.tsx`, `frontend/src/app/opengraph-image.tsx`

**쓰는 것:** 작업 2의 토큰과 `LEVEL_COPY`. `make fe-a11y`의 `s3-*`.

- [ ] **1단계: 지금 실패하는 항목 확인**

```bash
cd frontend && pnpm build && pnpm exec playwright test -g "s3-"
```

- [ ] **2단계: `report.tsx` 크기와 배치**

| 위치 | 지금 | 바꿀 것 |
|---|---|---|
| `ReportCard`의 `Card` | `text-base` | `text-lg` |
| `ReportCard`의 `CardTitle` | `text-lg font-semibold` | `text-xl font-semibold` |
| `ReportCard`의 `CardDescription` | 기본값(`text-sm`) | `className="text-base"` |
| `CompareBars` 행 | `grid grid-cols-[4.5rem_1fr_3rem] items-center gap-2 text-sm` | `grid grid-cols-[minmax(4.5rem,auto)_1fr_auto] items-center gap-2 text-base` |
| `Source` | `text-xs text-muted-foreground` | `text-base text-muted-foreground` |
| 머리말 | `text-xs text-muted-foreground tabular-nums` | `text-base text-muted-foreground tabular-nums` |
| 공유받은 리포트 한 줄 | `text-sm font-semibold text-primary` | `text-lg font-semibold text-primary` |
| 단계 칩 `Badge` | 기본값(`text-xs`) | `className`에 `h-auto px-3 py-1 text-base` 추가 |
| 판정 설명 `copy.body` | `text-base text-muted-foreground` | `text-lg text-muted-foreground` |
| 수면무호흡증 설명 | `text-sm text-muted-foreground` | `text-lg text-muted-foreground` |
| 신호 아이콘 | `mt-1 size-4` | `mt-1 size-5` |
| "주요 신호" | `mt-1 shrink-0 text-xs text-warning` | `shrink-0 text-base font-semibold text-warning` |
| 단계 번호 원 | `size-6 … text-xs` | `size-8 … text-base` |
| 단계 설명 `step.note` | `text-sm text-muted-foreground` | `text-base text-muted-foreground` |
| `AccordionTrigger` | `items-center py-3 text-base` | `min-h-12 items-center py-3 text-lg` |
| `AccordionContent` | `text-muted-foreground` | `text-base text-muted-foreground` |
| 면책 문구 | `text-xs text-muted-foreground` | `text-base text-muted-foreground` |

판정 단계는 칩 글자, 주요 신호는 아이콘과 "주요 신호" 글자가 이미 색과 함께 쓰인다. 막대는 끝에 숫자가 있다. 색만으로 구분하는 곳을 새로 만들지 않는다.

- [ ] **3단계: `report.tsx` 문구.** 지금 문구가 파일에 없으면 건너뛰고 보고한다.

| 지금 | 바꿀 문구 | 감사 번호 |
|---|---|---|
| 수면 체크 리포트 · {date} · 배우자 관찰 {QUESTIONS.length}문항 | 수면 체크 리포트 · {date} · 옆에서 본 {QUESTIONS.length}가지 질문 | 35 |
| 한 시간에 15번 이상, 하룻밤이면 100번이 넘어요 | 심한 편이면 한 시간에 15번 넘게 깨요. 하룻밤이면 100번이 넘어요 | 54 |
| `label: "미치료"` | `label: "치료 안 함"` | 61 |
| 심한 경우 심혈관 질환 위험이 2.9배 높았어요 | 심한 경우 심장·혈관 병(심혈관 질환) 위험이 2.9배 높았어요 | 63 |
| `summary="심혈관 질환 위험: 일반인 1, 치료하지 않은 중증 수면무호흡증 2.9배"` | `summary="심장·혈관 병 위험: 일반인 1, 심한데 치료하지 않으면 2.9배"` | 64 |
| `label: "중증 미치료"` | `label: "심한데 치료 안 함"` | 65 |
| `note="본인부담 약 12~14만 원"` | `note="내가 내는 돈은 약 12~14만 원이에요"` | 95 |
| 수면클리닉 외래 상담 | 수면클리닉에서 진료 상담받기 | 96 |
| 하룻밤 수면다원검사 | 병원에서 하룻밤 자면서 검사받기(수면다원검사) | 97 |
| 병원에서 쓰는 수면무호흡 선별 기준(STOP-Bang)의 항목을 배우자가 옆에서 볼 수 있는 것으로 바꿔 만들었어요. | 병원에서 수면무호흡증을 가려낼 때 쓰는 질문(STOP-Bang)을 바탕으로 만들었어요. 옆에서 볼 수 있는 것만 묻도록 바꿨어요. | 101 |
| 숨 멈춤과 헐떡임은 미국수면학회 진료 지침이 수면무호흡을 의심하는 주요 증상으로 꼽아요. | 숨 멈춤과 헐떡임은 미국수면학회가 꼽는 주요 증상이에요. | 102 |
| 이 리포트는 진단이 아니에요. 정확한 판단은 진료로 받아요. | 이 리포트는 진단이 아니에요. 정확한 것은 병원 진료로 확인하세요. | 106 |

감사 70, 78, 84번은 감사 뒤에 문구가 바뀌어 지금 파일에 없다. 고치지 않는다.

- [ ] **4단계: `report.tsx` 처리방침 링크.** `footer`의 면책 문구 `<p>` 뒤에 추가한다(`Link`를 `next/link`에서 import).

```tsx
<Link
  href="/privacy"
  className="flex min-h-12 items-center text-base text-muted-foreground underline underline-offset-4"
>
  개인정보처리방침 보기
</Link>
```

- [ ] **5단계: `report-view.tsx`, `share-button.tsx`**

| 파일 | 위치 | 지금 | 바꿀 것 |
|---|---|---|---|
| `report-view.tsx` | 리포트 없음 문구 | `text-base` | `text-lg` |
| `report-view.tsx` | "다시 체크하기" 링크 | `buttonVariants()` | `cn(buttonVariants(), "min-h-14 px-6 text-lg whitespace-normal")`, 글자는 `shared ? "체크하기" : "다시 체크하기"` |
| `report-view.tsx` | 주요 버튼 | `h-12 w-full text-base` | `min-h-14 w-full py-2 text-lg whitespace-normal` |
| `report-view.tsx` | 고정 바 | `flex flex-col gap-1` | `flex flex-col gap-2` |
| `share-button.tsx` | 버튼 | `h-11 w-full text-base` | `h-auto min-h-12 w-full py-2 text-lg whitespace-normal` |
| `share-button.tsx` | 실패 토스트 | 링크를 복사하지 못했어요. 다시 시도해 주세요 | 링크를 복사하지 못했어요. 한 번 더 눌러 주세요 (34) |

- [ ] **6단계: 미리보기 문구**

| 파일 | 지금 | 바꿀 문구 | 감사 번호 |
|---|---|---|---|
| `app/r/page.tsx` `description` | 옆에서 본 코골이로 정리한 수면무호흡 신호와 검사 방법 | 옆에서 본 코골이, 병원에 가볼 만한지 알려드려요 | 146 |
| `app/opengraph-image.tsx` | 배우자 관찰 | 옆에서 본 9가지 | 144 |

- [ ] **7단계: 통과 확인**

```bash
cd frontend && pnpm build && pnpm exec playwright test -g "s3-"
```

기대: 네 화면의 6개 검사가 모두 통과. 대비 검사가 `bg-warning` 칩에서 실패하면 칩 글자색이 `text-background`인지 확인한다(작업 2의 새 `--warning` 위에서 8.5:1).

- [ ] **8단계: 정적 검사와 커밋**

```bash
cd frontend && pnpm exec tsc --noEmit && pnpm lint && pnpm format:check && cd ..
git add frontend/src/components/sleep/report.tsx frontend/src/components/sleep/report-view.tsx frontend/src/components/sleep/share-button.tsx frontend/src/app/r/page.tsx frontend/src/app/opengraph-image.tsx
git commit -m "feat: enlarge the report text and rewrite hard words in plain language"
```

### 작업 5: S4 근처 수면클리닉, 처리방침

**파일:** 수정 `frontend/src/app/clinics/page.tsx`, `frontend/src/components/clinics/clinic-finder.tsx`, `clinic-card.tsx`, `frontend/src/app/privacy/page.tsx`

**쓰는 것:** 작업 2의 토큰. `make fe-a11y`의 `s4-*`, `privacy`.

- [ ] **1단계: 지금 실패하는 항목 확인**

```bash
cd frontend && pnpm build && pnpm exec playwright test -g "s4-|privacy"
```

- [ ] **2단계: `clinics/page.tsx`**

| 위치 | 지금 | 바꿀 것 |
|---|---|---|
| 빈 데이터 안내 | `text-base` | `text-lg` |
| 빈 데이터 버튼 | `h-12 px-4 text-base` | `min-h-14 px-4 py-2 text-lg whitespace-normal` |
| 출처 줄 | `text-xs text-muted-foreground` | `text-base text-muted-foreground` |

- [ ] **3단계: `clinic-card.tsx`**

| 위치 | 지금 | 바꿀 것 |
|---|---|---|
| 병원명 `h2` | `min-w-0 text-base font-semibold [overflow-wrap:anywhere]` | `min-w-0 text-lg font-semibold [overflow-wrap:anywhere]` |
| 거리 | `shrink-0 text-sm text-muted-foreground tabular-nums` | `shrink-0 text-base text-muted-foreground tabular-nums` |
| 주소 | `text-sm text-muted-foreground` | `text-base text-muted-foreground` |
| 버튼 줄 | `flex gap-2` | `flex flex-wrap gap-2` |
| 전화하기 | `h-11 flex-1 text-base` | `h-auto min-h-12 flex-1 py-2 text-lg whitespace-normal` |
| 병원 정보 보기 | `h-11 flex-1 border-primary text-base text-primary` | `h-auto min-h-12 flex-1 border-primary py-2 text-lg whitespace-normal text-primary` |

- [ ] **4단계: `clinic-finder.tsx`**

| 위치 | 지금 | 바꿀 것 |
|---|---|---|
| 보기 방식 줄 | `flex gap-2` | `flex flex-wrap gap-2` |
| 지역 버튼 | `h-11 min-w-0 flex-1 justify-between px-3 text-base` | `h-auto min-h-12 flex-1 justify-between px-3 py-2 text-lg whitespace-normal` |
| 지역 버튼 안 글자 | `<span className="truncate tabular-nums">` | `<span className="text-left tabular-nums">` |
| 지역 버튼 글자(내 주변 방식일 때) | 지역 선택 | 지역 고르기 (113) |
| 내 주변 버튼 | `h-11 shrink-0 px-3 text-base` | `h-auto min-h-12 flex-1 px-3 py-2 text-lg whitespace-normal` |
| 위치 오류 | `text-sm text-muted-foreground` | `text-base text-muted-foreground` |
| 시트 제목 | 지역 선택 | 지역 고르기 (114) |
| 시트 닫기 | `size-11` | `size-12` |
| 빈 상태 안내 | `text-base` | `text-lg` |
| 빈 상태 버튼 | `h-11 px-4 text-base` | `min-h-12 px-4 py-2 text-lg whitespace-normal` |
| 지역 소제목 | `text-lg font-semibold` | `text-xl font-semibold` |
| `RegionOption` 버튼 | `h-11 justify-between px-3 text-base` | `h-auto min-h-12 justify-between px-3 py-2 text-lg whitespace-normal` |
| `RegionOption` 건수 | `text-sm text-muted-foreground tabular-nums` | `text-base text-muted-foreground tabular-nums` |

`SheetTitle`의 기본 글자 크기가 16px 미만이면 `className="text-xl"`을 준다(`components/ui/sheet.tsx`를 읽어 확인한다). 시트가 화면보다 길어지면 `SheetContent`에 `max-h-[85dvh] overflow-y-auto`를 준다.

- [ ] **5단계: `privacy/page.tsx`**

| 위치 | 지금 | 바꿀 것 | 감사 번호 |
|---|---|---|---|
| 적용일 줄 | `text-sm text-muted-foreground`, "코골이체커 · 2026년 10월 2일부터 적용" | `text-base text-muted-foreground`, "코골이 체크 · 2026년 10월 2일부터 적용" | 130 |
| 섹션 제목 `h2` | `text-lg font-semibold` | `text-xl font-semibold` | |
| 본문 `ul` | `text-base` | `text-lg` | |
| 체크 응답 1 | 체크에 답한 내용은 서버에 저장하지 않고 어디로도 보내지 않아요. | 체크에 답한 내용은 어디에도 저장하지 않고 보내지 않아요. | 132 |
| 체크 응답 2 | 응답은 리포트 주소의 # 뒤에만 담기고, 이 부분은 브라우저 밖으로 전송되지 않아요. | 답은 리포트 주소(링크) 안에만 담겨요. 이 주소를 받은 사람만 리포트를 볼 수 있어요. | 133 |
| 방문 기록 2 | Google 애널리틱스: 방문한 페이지, 체크 시작·완료와 결과 단계, 리포트 보내기와 병원 찾기 클릭, 기기와 브라우저 정보 | Google 애널리틱스에는 본 화면, 체크 시작과 완료, 결과 단계, 누른 버튼, 기기 종류를 보내요. | 136 |
| 방문 기록 3 | Meta 픽셀: 방문한 페이지, 체크 완료, 병원 찾기 클릭. 결과 단계와 응답은 보내지 않아요. | Meta 픽셀에는 본 화면, 체크 완료, 병원 찾기를 눌렀는지만 보내요. 결과 단계와 답은 보내지 않아요. | 137 |
| 섹션 제목 | 보관과 거부 | 기록 보관과 끄는 방법 | 139 |
| 보관 1 | 방문 기록은 Google과 Meta의 정책에 따라 보관돼요. | 방문 기록은 Google과 Meta가 각자 정한 기간 동안 보관해요. | 140 |

처리방침 맨 아래에 처음 화면으로 가는 링크를 둔다.

```tsx
<Link
  href="/"
  className="flex min-h-12 items-center text-lg text-primary underline underline-offset-4"
>
  처음으로 가기
</Link>
```

- [ ] **6단계: 통과 확인**

```bash
cd frontend && pnpm build && pnpm exec playwright test -g "s4-|privacy"
```

기대: 세 화면의 6개 검사가 모두 통과. 병원 카드 337개의 버튼 간격(8px)과 글자 200%에서 버튼이 줄바꿈되는지가 주로 걸린다.

- [ ] **7단계: 정적 검사와 커밋**

```bash
cd frontend && pnpm exec tsc --noEmit && pnpm lint && pnpm format:check && cd ..
git add frontend/src/app/clinics/page.tsx frontend/src/components/clinics frontend/src/app/privacy/page.tsx
git commit -m "feat: enlarge text and tap targets on the clinic list and privacy page"
```

### 작업 6: 게이트 편입, 스크린샷, 검증

**파일:** 수정 `Makefile`, `.github/workflows/gate.yml`, `docs/05-verification.md` · 생성 `docs/05-verification/a11y/*.png`

- [ ] **1단계: 전체 통과 확인**

```bash
make fe-a11y
grep -rnE "text-(xs|sm)\b|truncate|line-clamp" frontend/src/app frontend/src/components/sleep frontend/src/components/clinics
grep -rn "코골이체커" frontend/src
```

기대: 화면 11개 × 검사 6개 = 66개 통과, 두 `grep` 모두 결과 없음.

- [ ] **2단계: 게이트에 넣기.** `Makefile`

```make
gate: fe-check crawler-check fe-a11y
	@echo "GATE PASS"
```

`fe-check`가 이미 빌드하므로 `fe-a11y`의 `pnpm build`가 한 번 더 돈다. 순서에 기대지 않게 그대로 둔다.

`.github/workflows/gate.yml`의 `make gate` 앞에 추가한다.

```yaml
      - run: pnpm --dir frontend exec playwright install --with-deps chromium
```

- [ ] **3단계: 스크린샷**

```bash
cd frontend && pnpm build && A11Y_SHOTS=1 pnpm exec playwright test -g "스크린샷" && cd ..
ls docs/05-verification/a11y | wc -l
```

기대: 66장(화면 11 × 폭 2 × 글자 3). 320px·200% 스크린샷을 직접 열어 겹침과 잘림을 본다.

- [ ] **4단계: 검증.** `/gate`로 `verifier`와 `design-reviewer`를 돌려 05의 A1~A15를 판정받는다(A13은 사용자 확인으로 남긴다). 결과를 `docs/05-verification.md`의 "결과"에 적는다.

- [ ] **5단계: 커밋과 푸시**

```bash
make gate
git add Makefile .github/workflows/gate.yml docs/05-verification.md docs/05-verification/a11y
git commit -m "test: gate on the accessibility check and record the screenshot matrix"
git push
```

---

# 구현 계획 3: 병원 데이터 보강

상태: 승인

**목표:** 레즈메드 크롤링은 그대로 두고, 공공 데이터로 좌표를 고치고(1단계), 병원 목록을 수면다원검사 실시기관 전체로 넓히고(2단계), 학회 목록 배지를 붙인다(3단계). 단계마다 끝까지 동작하는 상태로 커밋한다.

**스펙:** [03-tech-spec 추가 2](03-tech-spec.md#추가-2-병원-데이터-보강). 데이터 계약, 합치는 규칙, 파일 구성은 스펙을 따른다. 근거는 [data-quality](01-research/data-quality/README.md), [supply-gap](01-research/supply-gap/README.md).

## 공통 제약

- 크롤링 대상은 레즈메드를 유지한다. 레즈메드에 있는 병원의 `sourceUrl`(원 페이지 링크)은 바꾸지 않는다.
- `frontend/src/data/hospitals.json`은 크롤러(`make crawl`)만 쓴다. 손으로 고치지 않는다.
- 전화번호만, 이름만으로는 병원을 맞추지 않는다. 애매하면 맞추지 않는다.
- 크롤러는 새 의존성을 추가하지 않는다(Node 24 타입 스트리핑, `node:test`). 스냅샷 스크립트는 Python 표준 라이브러리만 쓴다.
- 심평원 원본 파일(60MB)은 저장소에 넣지 않는다. `crawler/data/hira-psg.json`(수면다원검사 실시기관만)만 넣는다.
- 데이터 형태를 바꾸는 단계(2·3단계)는 같은 커밋에서 크롤러 타입, 프론트 타입(`frontend/src/lib/hospitals.ts`), JSON을 함께 바꾼다.

## 작업 단위와 순서

| # | 작업 | 담당 | 소유 파일 | 의존 |
|---|---|---|---|---|
| 1 | 스냅샷 스크립트와 스냅샷 | data-implementer | `crawler/scripts/`, `crawler/data/`, `crawler/README.md` | - |
| 2 | 맞추기·합치기(좌표, 시·도, 긴 이름 교정). 데이터 형태는 그대로 | data-implementer | `crawler/src/`, `frontend/src/data/` | 1 |
| 3 | 목록 확장: 공공 데이터에만 있는 병원 추가, `sourceUrl` null 허용, `homepage`, `hiraVersion` | data-implementer + 메인(`lib/hospitals.ts`) + frontend-implementer(카드, 출처 줄) | `crawler/src/`, `frontend/src/data/`, `frontend/src/lib/hospitals*.ts`, `frontend/src/components/clinics/`, `frontend/src/app/clinics/page.tsx`, `frontend/src/components/analytics/track.ts` | 2, 계획 2의 작업 5 |
| 4 | 학회 목록 수집과 배지(`listed`) | data-implementer + 메인 + frontend-implementer | 위와 같음 + `crawler/src/sources/sleepnet.ts` | 3 |
| 5 | 검증 | 메인 | `docs/05-verification.md` | 4 |

### 작업 1·2: 좌표 교정 (1단계)

- [ ] `crawler/scripts/build_hira_snapshot.py`: 압축 파일 경로를 받아 `1.병원정보서비스`와 `10.…특수진료정보서비스`를 읽고, 특수진료 코드 `SH`인 기관만 스펙의 `HiraSnapshot` 형태로 `crawler/data/hira-psg.json`에 쓴다. 좌표가 없거나 한국 범위 밖인 기관은 빼고 건수를 출력한다. 기대: 약 735건.
- [ ] `crawler/src/match.ts`: `normalizePhone`, `normalizeName`, `addressKey`(도로명+건물번호), `findMatch(target, candidates)`. 테스트부터 쓴다: 전화+이름 일치, 전화+주소 일치, 주소+이름 일치, 전화만 같고 이름·주소가 다른 기관(맞추지 않음), 후보 둘(맞추지 않음), 법인명 접두어·괄호 정리.
- [ ] `crawler/src/sources/hira.ts`: 스냅샷을 읽고 필수 필드를 검증한다. 테스트: 필수 필드 없는 건 예외.
- [ ] `crawler/src/merge.ts`: 맞춘 병원은 좌표를 스냅샷 값으로, 이름이 40자를 넘으면 스냅샷 이름으로 바꾼다. `region`은 모든 병원에서 주소 첫 단어로 다시 계산한다(특별자치도, 전남광주통합특별시 규칙은 스펙). 테스트: 좌표 교체, 긴 이름 교체, 못 맞춘 병원은 그대로, 시·도 계산, 모르는 시·도 예외.
- [ ] `crawler/src/index.ts`: 레즈메드 수집 → 합치기 → 저장. 맞춘 건수, 못 맞춘 병원, 좌표가 1km 넘게 바뀐 병원을 로그에 남긴다.
- [ ] `make crawl` 실행. 기대: 337건 그대로, 맞춘 병원 약 332곳, 좌표가 500m 넘게 바뀐 병원 약 53곳, 봄봄이비인후과의원 좌표가 고양(위도 37.65 부근), 코앤365이비인후과의원이 양주(위도 37.79 부근), 창원·통영의 두 병원 `region`이 "경남", `busancoent` 이름이 40자 이하.
- [ ] `frontend/src/lib/hospitals.test.ts`에 좌표가 한국 범위 안인지와 위 병원들의 값 검사를 추가한다(메인).
- [ ] `make crawler-check`와 `make fe-check` 통과 후 커밋: `fix: correct clinic coordinates and regions with public hospital data`

### 작업 3: 목록 확장 (2단계)

- [ ] `merge.ts`: 스냅샷에만 있는 병원을 추가한다. `id`는 `hira-` + ykiho의 SHA-256 앞 10자, `sourceUrl`은 null, `homepage`는 스냅샷 값(스킴이 없으면 `https://`를 붙이고, 주소 형식이 아니면 null). 레즈메드 병원에도 `homepage`를 붙인다. 테스트 추가.
- [ ] `index.ts`: `hiraVersion`을 저장하고, 최소 건수를 600으로 올린다.
- [ ] `frontend/src/lib/hospitals.ts`(메인): `Hospital`에 `sourceUrl: string | null`, `homepage: string | null`, `HospitalData`에 `hiraVersion`. 카드가 쓸 `clinicLink(hospital): { target: "resmed" | "homepage" | "map"; href: string; label: string }`와 `mapSearchUrl(hospital)`을 추가하고 vitest로 테스트한다. 라벨은 "병원 정보 보기" / "병원 홈페이지 보기" / "지도에서 보기".
- [ ] `clinic-card.tsx`: 주요 버튼이 `clinicLink`를 쓴다. `track({ name: "clinic_click", …, target })`. 주소를 누르면 네이버 지도 검색이 새 탭으로 열린다(48px 터치 영역).
- [ ] `clinics/page.tsx`: 출처 줄 "레즈메드 병원찾기 · 건강보험심사평가원 2026년 6월 · 10월 3일 수집", 목록 위 "방문 전에 전화로 확인해 주세요".
- [ ] `make crawl` 실행. 기대: 약 745건, id 중복 없음.
- [ ] `make gate` 통과 후 커밋: `feat: list every sleep study clinic from public hospital data`

### 작업 4: 학회 배지 (3단계)

- [ ] `crawler/src/sources/sleepnet.ts`: `https://www.sleepnet.or.kr/hospital/find?page=1..5`를 1초 간격으로 받아 `openView({...})` 안의 JSON에서 이름, 주소, 전화, 홈페이지를 읽는다. 픽스처와 테스트. 요청이 실패하면 빈 목록을 돌려주고 로그를 남긴다.
- [ ] `merge.ts`: 같은 맞추기 규칙으로 `listed`를 붙인다. 학회 홈페이지가 있고 `homepage`가 비어 있으면 채운다. 테스트 추가.
- [ ] `lib/hospitals.ts`(메인): `listed: boolean`. `clinic-card.tsx`: 병원명 옆 `Badge` "수면학회 등록"(16px 이상). `clinics/page.tsx` 출처 줄에 "대한수면연구학회" 추가.
- [ ] `make crawl` 실행. 기대: `listed`가 true인 병원 50~90곳.
- [ ] `make gate` 통과 후 커밋: `feat: mark clinics listed by the sleep research society`

### 작업 5: 검증

- [ ] `docs/05-verification.md`에 체크리스트와 결과를 적는다: 건수, id 중복, 좌표 범위, 알려진 이상치 교정, 세 가지 카드 버튼의 링크, 배지, 내 주변 순 정렬, `clinic_click`의 `target`, `make gate`.

