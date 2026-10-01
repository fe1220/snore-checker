# Subject

> 과제 개요와 문제 정의는 [docs/01-problem-definition.md](docs/01-problem-definition.md)에 있습니다.

## 빠르게 실행하기

**필요한 것:** Python 3.12+, Node.js 20+, pnpm (`corepack enable pnpm`)

```bash
make setup   # 의존성 설치, 환경변수 파일 생성, DB 마이그레이션
make dev     # 백엔드 + 프론트 동시 실행 (Ctrl+C로 종료)
```

| 주소 | 내용 |
|---|---|
| http://localhost:3000 | 웹 화면 |
| http://localhost:8000/api/docs/ | API 문서 (Swagger) |
| http://localhost:8000/admin/ | 관리자 (`backend/.venv/bin/python backend/manage.py createsuperuser`로 계정 생성) |

별도 DB 설치 없이 SQLite로 바로 실행됩니다.

## Postgres로 실행하기 (선택)

운영과 같은 환경으로 확인하려면 Docker(또는 OrbStack)가 필요합니다.

```bash
make db-up   # Postgres 컨테이너 실행
```

`backend/.env`에서 `DATABASE_URL` 줄의 주석을 해제한 뒤 마이그레이션합니다.

```bash
backend/.venv/bin/python backend/manage.py migrate
```

## 검증

```bash
make gate    # 백엔드 린트·마이그레이션·테스트·API 스키마 + 프론트 타입체크·린트
```

## 문서

| 문서 | 내용 |
|---|---|
| [docs/01-problem-definition.md](docs/01-problem-definition.md) | 문제 정의, 목표, 스코프 |
| [docs/02-design-pass.md](docs/02-design-pass.md) | 화면 구조와 UX 결정 |
| [docs/03-tech-spec.md](docs/03-tech-spec.md) | 데이터 모델, API 계약 |
| [docs/04-plan.md](docs/04-plan.md) | 구현 작업 분할 |
| [docs/05-verification.md](docs/05-verification.md) | 검증 기준과 결과 |
| [DESIGN.md](DESIGN.md) | 디자인 시스템 규칙 |

## 기술 스택

- **Backend:** Django 5.2, Django REST Framework, drf-spectacular, pytest
- **Frontend:** Next.js (App Router), Tailwind CSS v4, shadcn/ui, TanStack Query
- **DB:** PostgreSQL 17 (로컬 기본값 SQLite)

## 문제 해결

| 증상 | 해결 |
|---|---|
| `pnpm: command not found` | `corepack enable pnpm` |
| 3000/8000 포트 사용 중 | 사용 중인 프로세스 종료 후 `make dev` |
| 화면에 "연결 실패" 표시 | 백엔드가 떠 있는지 확인 (http://localhost:8000/api/health/) |
