# Subject

> 과제 개요와 문제 정의는 [docs/01-problem-definition.md](docs/01-problem-definition.md)에 있습니다.

- 서비스 링크: (배포 후 추가)

## 로컬 실행

Node.js 20+, pnpm이 필요합니다 (`corepack enable pnpm`).

```bash
make setup   # 의존성 설치, frontend/.env.local 생성
make dev     # http://localhost:3000
```

`frontend/.env.local`에 Supabase 프로젝트의 URL과 publishable key를 넣습니다.

## 검증

```bash
make gate    # 프론트 타입체크·린트·포맷·빌드
```

## 문서

| 문서 | 내용 |
|---|---|
| [docs/00-assignment.pdf](docs/00-assignment.pdf) | 과제 원문 |
| [docs/01-problem-definition.md](docs/01-problem-definition.md) | 문제 정의, 목표, 스코프 |
| [docs/02-design-pass.md](docs/02-design-pass.md) | 화면 구조와 UX 결정 |
| [docs/03-tech-spec.md](docs/03-tech-spec.md) | 데이터 모델, 크롤링 대상 |
| [docs/04-plan.md](docs/04-plan.md) | 구현 작업 분할 |
| [docs/05-verification.md](docs/05-verification.md) | 검증 기준과 결과 |
| [docs/tech-stack.md](docs/tech-stack.md) | 기술 스택 선택 근거 |
| [docs/troubleshooting.md](docs/troubleshooting.md) | 주요 트러블슈팅 기록 |
| [DESIGN.md](DESIGN.md) | 디자인 시스템 규칙 |

## 기술 스택

Next.js (App Router) · Tailwind CSS v4 · shadcn/ui · Supabase · GitHub Actions (크롤러) · Vercel
