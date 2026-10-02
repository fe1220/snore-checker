# 구현 계획: 병원 데이터 보강

상태: 승인

**목표:** 레즈메드 크롤링은 그대로 두고, 공공 데이터로 좌표를 고치고(1단계), 병원 목록을 수면다원검사 실시기관 전체로 넓히고(2단계), 학회 목록 배지를 붙인다(3단계). 단계마다 끝까지 동작하는 상태로 커밋한다.

**스펙:** [스펙](spec.md). 데이터 계약, 합치는 규칙, 파일 구성은 스펙을 따른다. 근거는 [data-quality](../../research/data-quality/README.md), [supply-gap](../../research/supply-gap/README.md).

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
| 5 | 검증 | 메인 | `docs/work/03-clinic-data/verification.md` | 4 |

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

- [ ] `docs/work/03-clinic-data/verification.md`에 체크리스트와 결과를 적는다: 건수, id 중복, 좌표 범위, 알려진 이상치 교정, 세 가지 카드 버튼의 링크, 배지, 내 주변 순 정렬, `clinic_click`의 `target`, `make gate`.

