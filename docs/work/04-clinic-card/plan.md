# 계획: 병원 카드 정보

상태: 승인

스펙: [spec.md](spec.md). 작업 단위 하나, 커밋 하나다.

## 작업 1: 규모, 목록 기준 문장, 학회 먼저 정렬

| 파일 | 바꾸는 것 |
|---|---|
| `crawler/src/merge.ts` (+ 테스트) | `Hospital`에 `kind`. 맞춘 레즈메드 병원과 공공 데이터 병원에 스냅샷 종별을 넣는다(`kindOf`). 테스트: 네 종별, "상급종합" 변환, 그 밖의 종별과 못 맞춘 병원은 null |
| `frontend/src/data/hospitals.json` | `make crawl`로만 다시 만든다 |
| `frontend/src/lib/hospitals.ts` (+ 테스트) | `Hospital.kind`. `filterByRegion`이 학회 목록 병원을 먼저 두고 그 안에서 주소순. 테스트 추가 |
| `frontend/src/components/clinics/clinic-card.tsx` | 배지 자리에 "규모 · 수면학회 등록" |
| `frontend/src/app/clinics/page.tsx` | 목록 위 문장 |

확인: `make gate`(프론트 테스트, 크롤러 테스트, 접근성 측정 88).

커밋: `feat: show clinic size, explain the list, and put society-listed clinics first`
