# Subject

> 과제 개요와 문제 정의는 [docs/01-problem-definition.md](docs/01-problem-definition.md)에 있습니다.

- 서비스 링크: (배포 후 추가)

## 로컬 실행

Node.js 24+, pnpm이 필요합니다 (`corepack enable pnpm`).

```bash
make setup   # 의존성 설치, frontend/.env.local 생성
make dev     # http://localhost:3000
make crawl   # 병원 데이터 크롤링 → frontend/src/data/hospitals.json
```

DB 없이 동작합니다. `frontend/.env.local`의 `NEXT_PUBLIC_GA_ID`는 선택이며, 비워두면 분석 스크립트를 불러오지 않습니다.

크롤러는 GitHub Actions(`.github/workflows/crawl.yml`)가 매주 실행하고, 데이터가 바뀌면 커밋해 Vercel 재배포를 트리거합니다.

## 검증

```bash
make gate    # 프론트 타입체크·린트·포맷·테스트·빌드, 크롤러 타입체크·테스트
```

## 문서

| 문서 | 내용 |
|---|---|
| [docs/00-assignment.pdf](docs/00-assignment.pdf) | 과제 원문 |
| [docs/01-problem-definition.md](docs/01-problem-definition.md) | 문제 정의, 목표, 스코프 |
| [docs/02-design-pass.md](docs/02-design-pass.md) | 화면 구조와 UX 결정 |
| [docs/03-tech-spec.md](docs/03-tech-spec.md) | 데이터 계약, 크롤링 대상 |
| [docs/04-plan.md](docs/04-plan.md) | 구현 작업 분할 |
| [docs/05-verification.md](docs/05-verification.md) | 검증 기준과 결과 |
| [docs/tech-stack.md](docs/tech-stack.md) | 기술 스택 선택 근거 |
| [docs/troubleshooting.md](docs/troubleshooting.md) | 주요 트러블슈팅 기록 |
| [DESIGN.md](DESIGN.md) | 디자인 시스템 규칙 |

## 기술 스택

Next.js (App Router) · Tailwind CSS v4 · shadcn/ui · GitHub Actions (크롤러) · Vercel · GA4
