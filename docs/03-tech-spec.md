# 테크스펙

상태: 승인

[디자인패스](02-design-pass.md)의 S4 근처 수면클리닉을 구현하기 위한 스펙이다. 스택과 저장 원칙은 [tech-stack](tech-stack.md)을 따른다. S1~S3은 이미 배포돼 있어 이 문서에서 다루지 않는다.

## 범위

| 포함 | 제외 (다음 레이어) |
|---|---|
| 레즈메드 병원찾기 337곳 수집 | 대한수면연구학회 수집과 인증 배지 |
| S4 화면: 시·도 선택, 병원 카드, 전화하기, 병원 정보 보기(외부 링크) | 시·군·구 선택, 지도 |
| 내 주변 순으로 보기 (위치 권한은 버튼을 누를 때만 요청) | 병원 광고 자리 |
| 리포트의 "근처 수면클리닉 찾기"가 S4로 가도록 변경 | |

학회 배지를 뺀 이유: 두 출처의 병원을 이름·전화번호로 맞춰야 하는데, 잘못 맞으면 인증 배지가 엉뚱한 병원에 붙는다. 레즈메드만으로 끝까지 동작하는 버전을 먼저 낸다.

구현은 두 레이어로 나눈다. 1) 수집 + 지역 선택 목록이 끝까지 동작한다. 2) 그 위에 내 주변 순 정렬을 얹는다.

## 데이터 흐름

```
GitHub Actions (매주 월 03:00 KST, 수동 실행 가능)
  → crawler: resmed.kr/psg-finder 1회 요청 → 파싱
  → frontend/src/data/hospitals.json 커밋 → push
  → Vercel 재배포 → /clinics 정적 생성
```

- `crawledAt`이 매번 바뀌므로 병원 정보가 그대로여도 매주 커밋·재배포된다. 화면의 수집 시각이 갱신돼야 하므로 의도한 동작이다.

## 수집 대상

`https://www.resmed.kr/psg-finder` (2026-10-02 확인: 200, 정적 HTML, 337건)

병원 하나가 인라인 스크립트 한 덩어리로 들어 있다.

```js
var html = "<div class=\"store-item \">"+
    "<div class=\"item-title title3\">김영석이비인후과의원</div>"+
  "<div class=\"item-address\">"+
    "<p>강원도 원주시 원문로 116<br> 26408</p>"+
  "</div>"+
    "<div class=\"item-phone\">033-744-5075</div>"+
  "<div class=\"item-details\">"+
    "<a href=\"psg-finder/gangwonkysent\">세부 정보보기</p>"+ ...
locations.push({ 'id': ..., 'html': html, 'name': "...", 'district_kr': "강원도", 'lat': 37.35688, 'lng': 127.93463 });
```

- 목록 페이지 한 번으로 필요한 필드가 모두 나온다. 상세 페이지 337개는 요청하지 않는다(병원 홈페이지 URL은 상세에만 있지만, 외부 링크는 레즈메드 상세 페이지로 충분하다).
- HTML이 JS 문자열 안에 있어 DOM 파서를 쓸 수 없다. 정규식으로 덩어리를 나눠 읽는다. 의존성은 추가하지 않는다.

## 데이터 계약

`frontend/src/data/hospitals.json` (크롤러만 쓴다)

```ts
type HospitalData = {
  crawledAt: string // ISO 8601
  items: Hospital[]
}

type Hospital = {
  id: string // 레즈메드 slug (예: "gangwonkysent")
  name: string
  region: Region // 시·도 약칭
  address: string // 우편번호 제외
  phone: string | null // 원문 표기 그대로 (예: "033-744-5075")
  lat: number
  lng: number
  sourceUrl: string // https://www.resmed.kr/psg-finder/{id}
}

type Region =
  | "서울" | "경기" | "인천" | "부산" | "대구" | "광주" | "대전" | "울산" | "세종"
  | "강원" | "충북" | "충남" | "전북" | "전남" | "경북" | "경남" | "제주"
```

- `region`: 원본이 "강원도"·"경기도"·"서울"·"충북"처럼 섞여 있어 크롤러가 약칭으로 통일한다. 목록에 없는 값이 나오면 수집을 실패시킨다.
- `lat`·`lng`는 내 주변 순 정렬의 거리 계산에 쓴다.
- 타입은 `crawler/src/sources/resmed.ts`와 `frontend/src/lib/hospitals.ts`에 각각 둔다(패키지가 분리돼 있다). 형태를 바꾸면 둘과 JSON을 같은 작업에서 고친다.

## 크롤러

| 파일 | 역할 |
|---|---|
| `crawler/src/sources/resmed.ts` | `parse(html): Hospital[]` (순수 함수), `crawl()` (요청 + 파싱) |
| `crawler/src/sources/resmed.test.ts` | `parse` 테스트 |
| `crawler/fixtures/resmed.html` | 실제 페이지에서 병원 몇 건만 남긴 테스트용 HTML |
| `crawler/src/index.ts` | `sources`에 레즈메드 등록, 최소 건수 검사 추가 |

실패 처리 (어느 경우든 저장하지 않아 이전 데이터가 유지된다)

| 상황 | 동작 |
|---|---|
| 요청 실패 (4xx, 5xx, 네트워크) | 예외 → 종료 코드 1 |
| 수집 200건 미만 (페이지 구조가 바뀜) | 예외 → 종료 코드 1 |
| 알 수 없는 시·도 값 | 예외 → 종료 코드 1 |
| 병원 한 건에 이름·주소·slug·위경도 중 하나가 없음 | 그 건만 건너뛰고 로그에 남김 |
| 전화번호 없음 | `phone: null`로 저장 |

- 워크플로우(`.github/workflows/crawl.yml`)는 고치지 않는다. 실패하면 Actions 실행이 빨갛게 남는다.

## 프론트

| 파일 | 역할 |
|---|---|
| `src/lib/hospitals.ts` | 타입, `getHospitalData()`, `listRegions(items)`, `filterByRegion(items, region)`, `sortByDistance(items, origin)`, `formatDistance(km)`, `formatCrawledAt(iso)`, `CLINIC_FINDER_URL` |
| `src/lib/hospitals.test.ts` | 위 함수 테스트 |
| `src/app/clinics/page.tsx` | 서버 컴포넌트. 데이터를 읽어 props로 내려준다. 메타데이터 |
| `src/components/clinics/clinic-finder.tsx` | 클라이언트. 보기 방식 상태, 지역 Sheet, 위치 요청, 목록, 빈 상태 |
| `src/components/clinics/clinic-card.tsx` | 병원 카드. 거리, 전화하기, 병원 정보 보기 |

- 삭제: `src/app/go/clinic/`, `src/components/sleep/clinic-redirect.tsx`. `CLINIC_FINDER_URL`은 `sleep-check.ts`에서 `hospitals.ts`로 옮긴다.
- `report-view.tsx`의 CTA: 링크를 `/go/clinic` → `/clinics`로 바꾸고 외부 링크 아이콘을 뺀다(내부 이동이 된다).
- 새 shadcn 컴포넌트는 필요 없다(`sheet`, `card`, `button`이 있다).

### 보기 방식

화면은 둘 중 하나의 방식으로 목록을 보여준다. 상태는 클라이언트(`useState`)에만 둔다.

| 방식 | 들어가는 법 | 목록 | 카드 |
|---|---|---|---|
| 지역 (기본, "전체") | 지역 Sheet에서 시·도 선택 | 선택한 지역, 지역 순서 → 주소 가나다순 | 거리 없음 |
| 내 주변 | "내 주변 순으로 보기" 누르고 위치 허용 | 전국 337곳, 가까운 순 | 거리 표시 |

- 지역을 고르면 지역 방식으로, 내 주변 버튼을 누르면 내 주변 방식으로 바뀐다. 둘을 조합하지 않는다.
- 페이지네이션은 없다. 목록 전체를 한 번에 그린다(정적 HTML 337건). 필요한 병원이 위에 오게 하는 것은 지역 선택과 거리 정렬의 몫이다.
- 지역 목록: 위 `Region` 순서 고정, 병원이 있는 지역만, 건수와 함께 보여준다(예: "서울 81").
- 전화하기: `tel:` 링크. `phone`이 없으면 버튼을 그리지 않는다.
- 병원 정보 보기: `sourceUrl`, 새 탭(`target="_blank" rel="noopener noreferrer"`), 외부 링크 아이콘.
- 수집 시각: `formatCrawledAt`이 KST로 고정해 "10월 2일" 형식으로 만든다.

### 위치

- `navigator.geolocation.getCurrentPosition`을 버튼을 눌렀을 때만 부른다. 옵션은 `enableHighAccuracy: false`, `timeout: 10000`. 시·도 안에서 가까운 순을 가리는 데는 대략적인 위치면 충분하다.
- 좌표는 거리 계산에만 쓰고 저장·전송하지 않는다. 새로고침하면 지역 방식("전체")으로 돌아간다.
- 거리는 하버사인 직선거리다. 1km 미만은 "800m", 그 이상은 "2.3km"로 표시한다.

### 상태

| 상태 | 조건 | 화면 |
|---|---|---|
| 로딩 | 없음 (정적 생성) | - |
| 위치 확인 중 | 내 주변 버튼을 누른 뒤 응답 전 | 버튼 비활성 + "위치 확인 중…". 목록은 그대로 둔다 |
| 위치 거부 | `PERMISSION_DENIED` | 버튼 아래 "위치 권한이 꺼져 있어요. 지역을 골라 주세요". 지역 방식 유지 |
| 위치 실패 | 시간 초과, 위치 불가, 미지원 브라우저 | 버튼 아래 "위치를 확인할 수 없어요. 지역을 골라 주세요". 지역 방식 유지 |
| 빈 상태 | 선택한 지역에 병원 없음 | 아이콘 + "이 지역에는 아직 등록된 곳이 없어요" + 전체 보기 |
| 에러 | `items`가 비어 있음 | 안내 문구 + 레즈메드 병원찾기 외부 링크 |

지역 목록을 병원이 있는 지역만으로 만들기 때문에 빈 상태는 정상 흐름에서는 나오지 않는다. 방어용으로 구현한다.

## 분석

| 이벤트 | 시점 | GA4 | 메타 픽셀 |
|---|---|---|---|
| (페이지뷰) | `/clinics` 진입 | 자동 | 자동 |
| `clinic_click` | 병원 정보 보기 클릭 | `hospital_id`, `region` | `ClinicClick` (파라미터 없음) |
| `clinic_call` | 전화하기 클릭 | `hospital_id`, `region` | 보내지 않음 |
| `clinic_nearby` | 내 주변 버튼의 결과가 나왔을 때 | `result`: `granted` / `denied` / `failed` | 보내지 않음 |

- `clinic_click`의 의미가 "S4로 이동"에서 "병원 외부 링크 클릭"으로 바뀐다. 과제의 외부 링크 전환과 광고주(병원)에게 보여줄 지표가 이쪽이다.
- 병원 ID와 지역은 공개된 병원 정보이고 체크 응답과 연결되지 않는다. 결과 단계와 좌표·거리는 어떤 이벤트에도 붙이지 않는다.

## 테스트

| 대상 | 방법 |
|---|---|
| `resmed.parse` | `node --test`. 픽스처 3건 → 필드 값, 시·도 통일, 우편번호 제거, 전화번호 없음, 필수 필드 없는 건 건너뛰기, 알 수 없는 시·도 예외 |
| `hospitals.ts` | vitest. 지역 목록 순서·건수, 필터, 주소 정렬, 거리 정렬, 거리·수집 시각 포맷 |
| 화면 | `/gate`의 브라우저 QA (컴포넌트 렌더링 테스트는 두지 않는다). 위치 허용·거부·실패 세 경우를 모두 본다 |
| 전체 | `make gate` |

## 리스크

| 리스크 | 대응 |
|---|---|
| 레즈메드가 페이지 구조를 바꾼다 | 200건 미만이면 저장하지 않는다. 이전 데이터로 서비스가 유지되고 Actions 실패로 알 수 있다 |
| 유입이 메타 광고라 인스타그램·페이스북 인앱 브라우저에서 열린다. 인앱 브라우저는 위치 요청이 거부되거나 응답이 없을 수 있다 | 시간 제한 10초 뒤 실패 안내를 보여주고 지역 선택으로 계속 쓸 수 있게 한다. 검증 때 인앱 브라우저에서 직접 확인한다 |
| 직선거리라 실제 이동 거리와 다르다 | 정렬 기준으로만 쓰고 "약"을 붙이지 않은 짧은 표기로 둔다. 길 안내는 병원 페이지에 맡긴다 |
| 레즈메드 상세 페이지 주소(slug)가 바뀐다 | 주 1회 재수집으로 따라간다 |
