BE := backend
VENV := $(BE)/.venv/bin
# 3.12 이상인 Python을 찾는다. macOS 기본 python3(3.9)보다 Homebrew 버전을 우선한다.
PYTHON ?= $(shell for p in python3.13 python3.12 python3; do command -v $$p >/dev/null && $$p -c 'import sys; sys.exit(sys.version_info < (3, 12))' 2>/dev/null && { command -v $$p; break; }; done)

.PHONY: check-prereq setup setup-agent db-up db-down dev dev-be dev-fe be-check fe-check gate

check-prereq:
	@[ -n "$(PYTHON)" ] || { echo "Python 3.12 이상이 필요합니다 (현재 python3: $$(python3 --version 2>&1))"; echo "설치: brew install python@3.13"; exit 1; }
	@echo "Python: $(PYTHON)"
	@command -v node >/dev/null || { echo "Node.js 20+ 가 필요합니다: https://nodejs.org"; exit 1; }
	@command -v pnpm >/dev/null || { echo "pnpm 이 없습니다. 실행: corepack enable pnpm"; exit 1; }

setup: check-prereq ## 백엔드/프론트 로컬 환경 구성
	cd $(BE) && $(PYTHON) -m venv .venv && .venv/bin/pip install -q -r requirements.txt
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
	cd frontend && pnpm exec next typegen && pnpm exec tsc --noEmit && pnpm lint && pnpm format:check

gate: be-check fe-check
	@echo "GATE PASS"
