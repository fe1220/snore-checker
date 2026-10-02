# 코골이 진단

> 남편이 코를 곤다. 괴로운 건 아내인데, 병원에 가야 하는 건 남편이다. 아내는 이게 병인지, 치료되는지, 어디로 가면 되는지 몰라서 참고 지낸다.

옆에서 본 것만으로 3분 무료진단을 하고, 수면무호흡증일 수 있는지·치료되는지·방치하면 어떤지를 리포트로 받고, 근처 수면클리닉의 원 페이지로 넘어가는 서비스다. 리포트는 남편에게 링크로 보낼 수 있다.

- **서비스 링크:** https://snore-check.vercel.app
- **대상:** 코 고는 사람과 같이 사는 40~60대 아내
- **북극성 지표:** 리포트를 본 사람 중 병원 외부 링크를 누른 비율

## 제출물 바로가기

| 과제 요구사항 | 어디에 있나 |
|---|---|
| 서비스가 배포된 링크 | https://snore-check.vercel.app |
| 문제 정의 및 기획 과정 | [핵심 문서](#핵심-문서) 표의 순서대로 읽으면 된다. 결정이 바뀐 과정은 [기획 로그](docs/01-planning-log.md) |
| 주요 트러블슈팅 기록 | [docs/troubleshooting.md](docs/troubleshooting.md) |
| 크롤링 + 원 페이지 외부 링크 | 레즈메드 수면다원검사 병원찾기 337곳을 크롤링하고, 병원 카드의 "병원 정보 보기"가 레즈메드 병원 상세 페이지로 간다. 링크 337개 전부 살아 있는 것을 확인했다([데이터 품질](docs/01-research/data-quality/README.md)) |

## 핵심 문서

평가자가 읽을 문서다. 위에서부터 읽으면 문제 → 해법 → 사업성 → 구현 → 검증 순서로 이어진다.

| 순서 | 문서 | 목적 | 핵심 |
|---|---|---|---|
| 1 | [문제 정의](docs/01-problem-definition.md) | 누구의 어떤 문제를 푸는지 | 괴로운 건 배우자, 병원에 가야 하는 건 당사자다. 배우자에게 판단 기준과 경로가 없는 게 메인 막힘이다. 타겟은 배우자 있는 환자의 74%가 몰린 40~60대 |
| 2 | [솔루션 방향](docs/01-solution-direction.md) | 막힘마다 무엇으로 대응하는지 | 작성자가 엄마에게 준 네 가지를 화면 셋(체크 결과, 근처 병원, 공유 링크)으로 옮긴다. 크롤링 요구 대응 포함 |
| 3 | [비즈니스 임팩트](docs/01-business-impact.md) | 누가 돈을 내고 왜 내는지 | 고객은 검사하는 병원이다. 병원은 클릭을 환자로 못 바꾸고, 이 서비스는 "판단을 마친 배우자"를 넘긴다. 진료받지 않는 환자 약 110만 명, 그중 타겟 약 53만 명. 수익은 목록 정액 광고(건당 수수료는 의료법 위반) |
| 4 | [가설 검증](docs/01-validation.md) | 무엇이 틀릴 수 있고 어떻게 확인하는지 | 핵심 가설을 H1~H4로 나눴다. 메타 광고로 유입 비용을 처음 잰다. 커뮤니티 글 분류는 수집이 막혀 멈췄다 |
| 5 | [기획 로그](docs/01-planning-log.md) | 결론에 이르기까지의 판단 | 검토한 질문과 결론, 10월 2일 방향 재정리, 재정리로 바뀐 결론 |
| 6 | [디자인패스](docs/02-design-pass.md) | 화면 흐름과 정보 위계 | S1 체크 시작 → S2 체크 → S3 리포트 → S4 근처 수면클리닉. 40~60대 접근성 기준 |
| 7 | [테크스펙](docs/03-tech-spec.md) | 데이터와 구현 설계 | DB 없이 크롤링 JSON을 커밋한다. 레즈메드 + 심평원 공공 데이터 + 학회 목록 |
| 8 | [검증](docs/05-verification.md) | 만든 것이 기준을 채우는지 | 체크리스트 3개와 결과, [가상 사용자 테스트](docs/05-verification/persona-test.md) |
| 9 | [트러블슈팅](docs/troubleshooting.md) | 막힌 문제와 해결 | 레즈메드 데이터가 JS 문자열 안에 있음, 좌표 6곳 중 1곳 오류, 수집 차단 등 5건 |

참고 문서: [기술 스택 근거](docs/tech-stack.md) · [에이전트 운영 기록](docs/agent-log.md) · [구현 계획](docs/04-plan.md)(작업 단위별 계획, 길다)

### 문서 구조

```
docs/
├── 00-assignment.pdf            과제 원문
├── 01-problem-definition.md     ① 문제 정의
├── 01-solution-direction.md     ② 솔루션 방향
├── 01-business-impact.md        ③ 비즈니스 임팩트
├── 01-validation.md             ④ 가설 검증
├── 01-planning-log.md           ⑤ 기획 로그
├── 01-research/                 1~5의 근거 자료
│   ├── evidence.md              수치 원출처 (환자 수·유병률·유배우율·수가)
│   ├── benchmark.md             국내외 서비스 46건 비교
│   ├── clinic-survey.md         국내 수면클리닉 95곳 홈페이지 전수 조사
│   ├── competitors.md           기존 플레이어
│   ├── voc.md                   환자·가족 후기, 아버지 인터뷰
│   ├── awareness.md             대중 인지도
│   ├── snoring.md               코골이와 수면무호흡
│   ├── snoring-surgery.md       단순 코골이 수술 근거
│   ├── business-model.md        병원 수입·의료법·광고
│   ├── marketing.md             수면클리닉 마케팅
│   ├── retention.md             진료 이후 리텐션
│   ├── crawl-targets.md         크롤링 대상
│   ├── meta-ads.md              메타 광고 설계
│   ├── accessibility.md         40~60대 접근성 기준 (→ 02)
│   ├── copy-audit.md            화면 문구 감사 (→ 02)
│   ├── data-quality/            병원 데이터 품질 검사 (→ 03)
│   └── supply-gap/              시·군·구별 병원 공백 (→ 03)
├── 02-design-pass.md            ⑥ 디자인패스
├── 03-tech-spec.md              ⑦ 테크스펙
├── 04-plan.md                   구현 계획
├── 05-verification.md           ⑧ 검증
├── 05-verification/             가상 사용자 테스트, 접근성 스크린샷
├── troubleshooting.md           ⑨ 트러블슈팅
├── tech-stack.md                기술 스택 근거
├── agent-log.md                 에이전트 운영 기록
└── archive/                     범위에서 뺀 조사 (기면증·렘수면, 쓰지 않은 질문지)
```

## 문제 정의 요약

- **출발점:** 작성자가 어머니에게 네 가지(병일 수 있다, 치료된다, 방치하면 위험하다, 어디서 어떻게 검사받는다)를 알려주자 어머니가 움직였고, 아버지는 진단과 양압기 치료까지 갔다. 당사자를 설득한 게 아니라 배우자에게 판단 기준과 경로를 줬다.
- **왜 문제인가:** [사실] 성인 남성 약 4%가 수면무호흡이고 검사와 양압기에 건강보험이 된다. [추정] 그런데 환자의 약 15%만 진료받는다. 남은 병목은 병원까지 가는 길이다.
- **빈자리:** 국내외 서비스 46건을 직접 확인했다. 배우자에게 말을 거는 곳은 있지만 대부분 자사 상담이나 제품으로 끝나고, 옆에서 본 것으로 체크해 중립 병원 목록까지 잇는 곳은 없었다([벤치마크](docs/01-research/benchmark.md)). 국내 수면클리닉 95곳 홈페이지에서는 읽을 수 있었던 81곳 중 배우자에게 직접 말을 거는 곳이 0곳이었다([전수 조사](docs/01-research/clinic-survey.md)).

## 이번에 한 일

| 영역 | 내용 | 근거 |
|---|---|---|
| 40~60대 접근성 | 글자 16px 이상(본문 18px), 터치 영역 48px 이상, 글자 대비 7:1. 글자 130%·200%와 폭 320px에서 깨지지 않게 했다. 브라우저에서 재는 측정 88개를 `make gate`와 CI에 넣었다 | [기준과 측정값](docs/01-research/accessibility.md), [스크린샷 66장](docs/05-verification/a11y/) |
| 쉬운 문구 | 화면 문구 148건을 감사해 35건을 고쳤다. 코 고는 사람은 "남편"으로 통일했다 | [문구 감사](docs/01-research/copy-audit.md), [DESIGN.md 용어표](DESIGN.md) |
| 병원 데이터 보강 | 레즈메드 좌표가 6곳 중 1곳꼴로 500m 넘게 틀린 것을 찾아 공공 데이터로 고쳤다. 병원을 337곳에서 수면다원검사 실시기관 744곳으로 넓혔다. 대한수면연구학회 목록 병원 73곳에 배지를 달았다 | [데이터 품질](docs/01-research/data-quality/README.md), [공급 공백](docs/01-research/supply-gap/README.md) |
| 공급 공백 분석 | 레즈메드 목록만으로는 시·군·구 230곳 중 124곳(인구 20.4%)에 병원이 없었다. 전체 검사기관으로 넓히면 인구 11.0%로 준다. 군 82곳 중 78곳은 여전히 0곳이다 | [공급 공백](docs/01-research/supply-gap/README.md) |

## 데이터 출처

| 출처 | 쓰는 곳 | 갱신 |
|---|---|---|
| [레즈메드 수면다원검사 병원찾기](https://www.resmed.kr/psg-finder) | 병원 337곳, 병원 상세 페이지 링크 | 매주 GitHub Actions |
| 건강보험심사평가원 "전국 병의원 및 약국 현황" (공공누리 제1유형) | 좌표 교정, 수면다원검사 실시기관 목록 확장 | 분기마다 수동 ([절차](crawler/README.md)) |
| [대한수면연구학회 수면클리닉 찾기](https://www.sleepnet.or.kr/hospital/find) | 학회 목록 배지 | 매주 GitHub Actions |

## 로컬 실행

Node.js 24+, pnpm이 필요하다 (`corepack enable pnpm`).

```bash
make setup   # 의존성 설치, frontend/.env.local 생성
make dev     # http://localhost:3000
make crawl   # 크롤링 → frontend/src/data/hospitals.json
make gate    # 타입체크·린트·포맷·테스트·빌드, 크롤러 테스트, 접근성 측정
```

DB와 백엔드 서버 없이 동작한다. 체크 응답은 저장하거나 보내지 않고 리포트 주소의 `#` 뒤에만 담는다. 근거는 [tech-stack](docs/tech-stack.md).

## 기술 스택

Next.js (App Router) · Tailwind CSS v4 · shadcn/ui · Playwright + axe (접근성 측정) · GitHub Actions (크롤러, 게이트) · Vercel · GA4
