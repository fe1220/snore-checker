BE := backend
VENV := $(BE)/.venv/bin

.PHONY: check-prereq setup setup-agent db-up db-down dev dev-be dev-fe be-check fe-check gate

check-prereq:
	@command -v python3 >/dev/null || { echo "Python 3.12+ 가 필요합니다: https://www.python.org/downloads/"; exit 1; }
	@python3 -c 'import sys; sys.exit(sys.version_info < (3, 12))' || { echo "Python 3.12 이상이 필요합니다 (현재: $$(python3 --version))"; exit 1; }
	@command -v node >/dev/null || { echo "Node.js 20+ 가 필요합니다: https://nodejs.org"; exit 1; }
	@command -v pnpm >/dev/null || { echo "pnpm 이 없습니다. 실행: corepack enable pnpm"; exit 1; }

setup: check-prereq ## 백엔드/프론트 로컬 환경 구성
	cd $(BE) && python3 -m venv .venv && .venv/bin/pip install -q -r requirements.txt
	@[ -f $(BE)/.env ] || sed "s|SECRET_KEY=change-me|SECRET_KEY=$$($(VENV)/python -c 'import secrets;print(secrets.token_urlsafe(50))')|" $(BE)/.env.example > $(BE)/.env
	$(VENV)/python $(BE)/manage.py migrate -v0
	@[ -f frontend/.env.local ] || cp frontend/.env.example frontend/.env.local
	pnpm --dir frontend install

setup-agent: ## 에이전트 스킬 설치 (gstack). superpowers는 Claude Code가 프로젝트 설정으로 설치를 안내한다.
	@if [ -d $$HOME/.claude/skills/gstack ]; then echo "gstack 설치됨"; \
	else git clone --depth 1 https://github.com/garrytan/gstack.git $$HOME/.claude/skills/gstack && cd $$HOME/.claude/skills/gstack && ./setup; fi

db-up: ## 로컬 Postgres 실행 (OrbStack/Docker 필요)
	docker compose up -d --wait db

db-down:
	docker compose down

dev: ## 백엔드(8000) + 프론트(3000) 동시 실행, Ctrl+C로 함께 종료
	@trap 'kill 0' INT TERM EXIT; \
	$(VENV)/python $(BE)/manage.py runserver 8000 & \
	pnpm --dir frontend dev & \
	wait

dev-be:
	$(VENV)/python $(BE)/manage.py runserver 8000

dev-fe:
	pnpm --dir frontend dev

be-check:
	cd $(BE) && .venv/bin/ruff check . && .venv/bin/python manage.py makemigrations --check --dry-run && .venv/bin/pytest -q && .venv/bin/python manage.py spectacular --validate --fail-on-warn --file /dev/null

fe-check:
	cd frontend && pnpm exec tsc --noEmit && pnpm lint

gate: be-check fe-check
	@echo "GATE PASS"
