# 스펙: 메타 광고 결과 리포트

상태: 승인

[메타 광고 전략](../../meta-ads/strategy.md)의 "결과"를 사람이 손으로 옮기지 않게, 명령 한 번으로 숫자를 모아 리포트를 쓴다. 광고가 10월 5일에 끝나 자동 실행 대신 수동 실행으로 둔다. 저장 원칙과 분석 이벤트는 [아키텍처](../../architecture.md)를 따른다.

## 범위

| 포함 | 제외 |
|---|---|
| 메타 광고 숫자(소재별): 비용, 노출, 링크 클릭, 랜딩 페이지 조회 | 광고 수정·예산 변경 (읽기만 한다) |
| GA4 퍼널(소재별): 체크 시작, 체크 완료, 병원 연결(링크 클릭·전화 걸기), 공유 | 개인 단위 데이터. 집계 숫자만 가져온다 |
| 리포트 파일 생성과 전략 문서의 결과 표 갱신 | 화면, 대시보드 |
| `make meta-report` 수동 실행 | 자동 실행, 자동 커밋. 광고 종료 뒤 분석 해석 (사람이 쓴다) |

## 데이터 흐름

```
make meta-report (로컬, 필요할 때)
  → reporting: 메타 Insights API(광고 단위) + GA4 Data API(utm_content 단위) 조회
  → docs/meta-ads/results/YYYY-MM-DD.md 생성
  → docs/meta-ads/strategy.md "결과" 표 갱신
```

- 기간은 캠페인 시작일부터 실행 전날까지 누적이다(`--until`로 바꿀 수 있다). 리포트 한 장이 그날 기준 전체 숫자다.
- 메타 광고와 GA4는 `utm_content`(소재 이름)로 잇는다. 광고 URL에 `utm_source=meta&utm_content={A|B|C|D1|D2}`가 붙어 있어야 한다. 메타 쪽은 **광고 이름**을 소재 이름으로 읽으니, 광고 이름도 `A`, `B`처럼 `utm_content`와 같게 둔다.

## 숫자

| 숫자 | 계산 | 출처 |
|---|---|---|
| 비용, 노출, 링크 클릭, 랜딩 페이지 조회 | 그대로 | 메타 (`spend`, `impressions`, `inline_link_clicks`, `landing_page_view` 액션) |
| 클릭률, 클릭당 비용 | 링크 클릭 ÷ 노출, 비용 ÷ 링크 클릭 | 메타 |
| 체크 시작·완료, 병원 링크 클릭, 병원 전화, 공유 | 이벤트 수(`check_start`, `check_complete`, `clinic_click`, `clinic_call`, `share_click`) | GA4, `sessionSource = meta` |
| 체크 완료율 | 체크 완료 ÷ 랜딩 페이지 조회 | 메타 + GA4 |
| 병원 연결 | 병원 링크 클릭 + 병원 전화. 내역은 "링크 · 전화" 열로 같이 보인다 | GA4 |
| 병원 연결률 | 병원 연결 ÷ 체크 완료 | GA4 |
| **병원 연결 1건당 비용** | 비용 ÷ 병원 연결 | 메타 + GA4 |

- 소재별 표와 합계 줄을 둔다. 소재별 숫자는 참고만 한다(메타가 예산을 반응 좋은 소재에 몰아준다).
- 분모가 0이면 "-"로 쓴다.
- GA4는 차단·동의 거부로 일부 이벤트가 빠진다. 리포트에 "GA4 숫자는 실제보다 적을 수 있다"를 한 줄 적는다.

## 리포트 형식

`docs/meta-ads/results/2026-10-04.md`

- 제목, 집계 기간, 생성 시각
- 합계 표(위 숫자 전부), 소재별 표
- 주의 문구(GA4 누락, 메타 숫자는 이후 보정될 수 있음)

`docs/meta-ads/strategy.md`의 "결과" 표는 `<!-- meta-report:start -->`와 `<!-- meta-report:end -->` 사이만 갈아 끼운다. 표 아래에 최신 리포트 링크를 둔다.

## 코드

새 패키지 `reporting/` (크롤러와 같은 방식: Node 24, TypeScript를 그대로 실행, `node --test`).

| 파일 | 역할 |
|---|---|
| `reporting/src/meta.ts` | 메타 Insights 요청과 응답 정리. `fetch`만 쓴다 |
| `reporting/src/ga4.ts` | GA4 Data API 요청. `@google-analytics/data`를 쓴다 |
| `reporting/src/report.ts` | 두 출처를 소재별로 합치고 비율 계산, 마크다운 생성 (순수 함수) |
| `reporting/src/index.ts` | 실행: 조회 → 리포트 파일 → 결과 표 갱신 |
| `reporting/src/*.test.ts` | `report.ts` 계산·마크다운, 결과 표 갈아 끼우기, API 응답 정리 |

## 설정 (사용자가 만든다)

| 이름 | 내용 | 둘 곳 |
|---|---|---|
| `META_ACCESS_TOKEN` | 메타 시스템 사용자 토큰, `ads_read` 권한 | `reporting/.env.local` |
| `META_AD_ACCOUNT_ID` | `act_` 로 시작하는 광고 계정 ID | `reporting/.env.local` |
| `META_CAMPAIGN_ID` | 이번 캠페인 ID | `reporting/.env.local` |
| `GA4_PROPERTY_ID` | GA4 속성 ID(숫자) | `reporting/.env.local` |
| `GA4_CREDENTIALS_FILE` | GA4 속성에 뷰어 권한을 준 서비스 계정 키(JSON) 파일 경로 | `reporting/.env.local` |

- `reporting/.env.local`은 git에서 제외한다. 서비스 계정 키는 JSON 파일 경로(`GA4_CREDENTIALS_FILE`)로 받고 파일도 저장소 밖에 둔다.
- 리포트 파일과 결과 표 변경은 사람이 확인하고 커밋한다.

## 실패 처리

| 상황 | 동작 |
|---|---|
| 설정 값이 없음 | 무엇이 없는지 출력하고 종료 코드 1 |
| 메타·GA4 요청 실패 | 종료 코드 1. 파일을 쓰지 않는다 |
| 메타는 됐고 GA4만 실패 | 쓰지 않고 실패한다. 반쪽 리포트를 남기지 않는다 |

## 리스크

| 리스크 | 대응 |
|---|---|
| 광고 URL에 `utm_content`가 없거나 소재 이름과 다르다 | 집행 중인 광고의 URL 파라미터를 먼저 확인한다. 못 맞춘 GA4 숫자는 "알 수 없음" 줄로 따로 보인다 |
| 토큰 만료 | 시스템 사용자 토큰은 만료가 없다. 개인 토큰을 쓰면 60일 뒤 실패로 드러난다 |

## 변경 (2026-10-03)

- 병원 전화(`clinic_call`)를 퍼널에 넣고, 링크 클릭과 합친 "병원 연결"을 주 지표로 바꿨다. 북극성 지표를 병원 연결 비율로 바꾼 데 맞췄다([성공 지표](../../solution-direction.md#성공-지표)).
