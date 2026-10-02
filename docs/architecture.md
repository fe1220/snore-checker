# 아키텍처

프로젝트 전체에서 지금 유효한 데이터 흐름, 데이터 계약, 저장 원칙, 분석 이벤트를 한곳에 모은다. 스택 선택 근거는 [tech-stack](tech-stack.md)에 있고, 작업별 상세는 아래 [작업별 스펙](#작업별-스펙)에 있다.

## 데이터 흐름

```
심평원 "전국 병의원 및 약국 현황" (분기마다 사람이 받음)
  → crawler/scripts/build_hira_snapshot.py → crawler/data/hira-psg.json 커밋

GitHub Actions crawl.yml (매주 월 03:00 KST, 수동 실행 가능)
  → crawler: 스냅샷 읽기 + resmed.kr/psg-finder 수집 + sleepnet.or.kr/hospital/find 수집
  → 합치기 → 검사 → frontend/src/data/hospitals.json 커밋 → push (바뀐 게 있을 때만)
  → Vercel 재배포 → /clinics 정적 생성
```

| 출처 | 가져오는 것 | 갱신 |
|---|---|---|
| 레즈메드 병원찾기 | 병원 337곳의 이름, 주소, 전화, 상세 페이지 주소 | 매주 자동 |
| 심평원 "전국 병의원 및 약국 현황" (공공누리 1유형, 출처 표시) | 수면다원검사 실시기관 735곳의 이름, 주소, 전화, 좌표, 홈페이지 | **분기마다 사람이 파일을 받아 스냅샷을 다시 만든다** |
| 대한수면연구학회 수면클리닉 찾기 | 학회 목록에 있는 병원 95곳 | 매주 자동 |

- 심평원 파일은 분기마다 나오고, 올려둔 사이트(opendata.hira.or.kr)의 robots.txt가 전체를 금지한다. 자동으로 받지 않는다.
- 스냅샷: `build_hira_snapshot.py`가 받은 압축 파일에서 `1.병원정보서비스`와 `10.…특수진료정보서비스`를 읽어, 특수진료 코드가 `SH`(수면다원검사 실시기관)인 기관만 `crawler/data/hira-psg.json`으로 쓴다. Python 표준 라이브러리만 쓴다. 원본 파일(60MB)은 저장소에 넣지 않는다. 실행: `python3 crawler/scripts/build_hira_snapshot.py "<압축 파일 경로>"`. 절차는 `crawler/README.md`에 있다.
- `crawledAt`이 매번 바뀌므로 병원 정보가 그대로여도 매주 커밋·재배포된다. 화면의 수집 시각이 갱신돼야 하므로 의도한 동작이다.

### 합치는 규칙

레즈메드 병원과 스냅샷 병원을 아래 순서로 맞춘다. 학회 목록도 같은 규칙으로 맞춘다.

1. 전화번호(숫자만)가 같고, 정리한 이름이 비슷하거나 주소(도로명+건물번호)가 같다.
2. 전화번호가 달라도 주소(도로명+건물번호)가 같고 정리한 이름이 비슷하다.

- 전화번호만 같거나 이름만 같으면 맞추지 않는다. 후보가 둘 이상이어도 맞추지 않는다.

| 경우 | 처리 |
|---|---|
| 양쪽에 다 있음 | 레즈메드의 id·이름·주소·전화·`sourceUrl`을 쓰고, **좌표와 홈페이지는 스냅샷 값**을 쓴다. 레즈메드 이름이 40자를 넘으면 스냅샷 이름을 쓴다 |
| 레즈메드에만 있음 | 레즈메드 값을 그대로 둔다 |
| 스냅샷에만 있음 | 종별이 의원·병원·종합병원·상급종합이면 스냅샷 값으로 새 병원을 만든다. `sourceUrl`은 null. 못 맞춘 레즈메드 병원과 같은 시·군·구에서 전화나 이름이 겹치면 중복일 수 있어 추가하지 않고 로그로 남긴다 |
| 학회 목록에 있음 | `listed: true`. 홈페이지가 비어 있으면 학회 값으로 채운다 |

- `region`은 모든 병원에서 주소 첫 단어로 다시 계산한다. "강원특별자치도"·"전북특별자치도"는 강원·전북으로, "전남광주통합특별시"는 뒤의 구 이름이 동구·서구·남구·북구·광산구면 광주, 아니면 전남으로 본다.
- 맞춘 건수, 못 맞춘 병원, 좌표가 1km 넘게 바뀐 병원을 크롤러 로그에 남긴다.

### 실패 처리

어느 경우든 저장하지 않으면 이전 데이터가 유지된다. 파일은 임시 파일에 다 쓴 뒤 바꿔치기한다.

| 상황 | 동작 |
|---|---|
| 요청 실패, 알 수 없는 시·도 값 | 예외 → 종료 코드 1 |
| 레즈메드 수집 200건 미만 | 저장하지 않음 |
| 합친 결과 600건 미만 | 저장하지 않음 |
| 저장 직전 검사 실패 (빈 필드, `sourceUrl` 불일치, 홈페이지가 http(s)가 아님, 좌표가 한국 밖, id 중복) | 저장하지 않음 |
| 학회 목록 수집 실패 | `listed`만 모두 false로 두고 저장 |

## 데이터 계약

`frontend/src/data/hospitals.json` (크롤러만 쓴다). 타입은 `crawler/src/merge.ts`와 `frontend/src/lib/hospitals.ts`에 각각 둔다(패키지가 분리돼 있다). 형태를 바꾸면 둘과 JSON을 같은 작업에서 고친다.

```ts
type HospitalData = {
  crawledAt: string // ISO 8601
  hiraVersion: string // 공공 데이터 기준 시점 (예: "2026.6")
  items: Hospital[]
}

type Hospital = {
  id: string // 레즈메드 slug. 공공 데이터에만 있는 병원은 "hira-" + ykiho 해시 앞 10자
  name: string
  region: Region // 시·도 약칭. 주소에서 다시 계산한다
  address: string
  phone: string | null // 지역번호 포함 (예: "033-744-5075")
  lat: number
  lng: number
  sourceUrl: string | null // 레즈메드 상세 페이지. 공공 데이터에만 있는 병원은 null
  homepage: string | null // 공공 데이터나 학회 목록에 있는 병원 홈페이지
  listed: boolean // 대한수면연구학회 수면클리닉 목록에 있음
}

type Region =
  | "서울" | "경기" | "인천" | "부산" | "대구" | "광주" | "대전" | "울산" | "세종"
  | "강원" | "충북" | "충남" | "전북" | "전남" | "경북" | "경남" | "제주"
```

- `phone`: 지역번호 없이 적힌 번호는 크롤러가 병원 시·도의 지역번호를 붙인다(서울 02, 경기 031 …). `1577-0083` 같은 대표번호와 이미 `0`으로 시작하는 번호는 그대로 둔다.
- `lat`·`lng`는 내 주변 순 정렬의 거리 계산에 쓴다.
- `sourceUrl`은 id가 `hira-`로 시작하면 null, 아니면 `https://www.resmed.kr/psg-finder/{id}`다.
- 카드의 외부 링크는 `sourceUrl` → `homepage` → 네이버 지도 검색 순으로 고른다.

## 저장 원칙

- 백엔드 서버와 DB가 없다. 체크 응답은 어디에도 저장·전송하지 않는다.
- 결과 공유 링크는 응답을 쿼리가 아니라 해시(`#` 뒤)에 담는다. GA 페이지뷰에는 해시를 뺀 주소만 보낸다. 메타 픽셀은 해시까지 보내므로 해시가 있는 동안에는 부르지 않는다.
- GA에는 응답이 아니라 결과 단계만 보낸다. 메타 픽셀에는 결과 단계도 보내지 않는다.

## 분석 이벤트

`frontend/src/components/analytics/track.ts` 기준.

| 이벤트 | 시점 | GA4 | 메타 픽셀 |
|---|---|---|---|
| `page_view` | 페이지 이동마다 | 해시를 뺀 주소 | `PageView` (해시가 없을 때만) |
| `check_start` | 첫 문항 응답 | 파라미터 없음 | 보내지 않음 |
| `check_complete` | 체크 완료 | `level` (결과 단계) | `Lead` (파라미터 없음) |
| `share_click` | 공유 버튼 클릭 | 파라미터 없음 | 보내지 않음 |
| `clinic_click` | 병원 외부 링크 클릭 | `hospital_id`, `region`, `target`: `resmed` / `homepage` / `map` | `ClinicClick` (파라미터 없음) |
| `clinic_call` | 전화하기 클릭 | `hospital_id`, `region` | 보내지 않음 |
| `clinic_nearby` | 내 주변 버튼의 결과가 나왔을 때 | `result`: `granted` / `denied` / `failed` | 보내지 않음 |

- 병원 ID와 지역은 공개된 병원 정보이고 체크 응답과 연결되지 않는다. 좌표·거리는 어떤 이벤트에도 붙이지 않는다.

## 작업별 스펙

- [S4 근처 수면클리닉](work/01-clinic-list/spec.md)
- [40~60대 접근성과 쉬운 문구](work/02-a11y-copy/spec.md)
- [병원 데이터 보강](work/03-clinic-data/spec.md)
