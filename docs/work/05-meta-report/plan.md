# 구현 계획: 메타 광고 결과 리포트

상태: 승인

**스펙:** [spec.md](spec.md). 사용자가 채팅에서 "수동 스크립트로 해달라"고 해 스펙 승인과 함께 바로 구현했다. 작업이 작아 단위 하나로 끝낸다.

## 작업 1: reporting 패키지와 make meta-report

**파일:** 생성 `reporting/`(package.json, tsconfig.json, .gitignore, .env.example, src/report.ts, src/meta.ts, src/ga4.ts, src/index.ts, src/report.test.ts) · 수정 `Makefile`, `.github/workflows/gate.yml`, `docs/meta-ads/strategy.md`

- [x] `report.ts`: 소재별 합치기, 합계, 비율, 리포트·결과 표 마크다운, 표시(`<!-- meta-report:start/end -->`) 사이 갈아 끼우기. 순수 함수
- [x] `meta.ts`: 캠페인 시작일, 광고 단위 Insights(페이지 넘김 포함). `fetch`만 쓴다. API 버전 기본 v26.0(`META_API_VERSION`으로 바꿀 수 있다)
- [x] `ga4.ts`: `sessionSource = UTM_SOURCE`(기본 `meta`)인 세션의 `check_start`·`check_complete`·`clinic_click`·`share_click`을 `sessionManualAdContent`별로 센다
- [x] `index.ts`: 설정 확인 → 기간(캠페인 시작일 ~ 어제, KST. `--since`·`--until`로 바꿀 수 있다) → 두 조회가 다 끝난 뒤에만 파일을 쓴다
- [x] 테스트 6개: 합치기 순서와 빈 값, 비율과 분모 0, 리포트 내용, 결과 표 갈아 끼우기, 메타 응답 정리, GA4 응답 정리
- [x] `make meta-report`(인자는 `ARGS="--until 2026-10-05"`), `make setup`에 설치 추가, `make gate`와 CI에 `reporting-check` 추가
- [ ] 실제 계정으로 한 번 돌려 숫자를 메타 광고 관리자·GA4 화면과 맞춰 본다 (설정을 받은 뒤)

## 검증

- `make reporting-check` 통과
- 설정이 없으면 빠진 이름을 출력하고 종료 코드 1
- 실제 실행 결과의 합계 비용·링크 클릭이 메타 광고 관리자와 같고, 체크 완료·병원 링크 클릭이 GA4 탐색 화면(같은 기간, 세션 소스 필터)과 같다
