FE := frontend
CR := crawler

.PHONY: check-prereq setup setup-agent dev crawl fe-check fe-a11y crawler-check gate

check-prereq:
	@command -v node >/dev/null || { echo "Node.js 24+ 가 필요합니다: https://nodejs.org"; exit 1; }
	@command -v pnpm >/dev/null || { echo "pnpm 이 없습니다. 실행: corepack enable pnpm"; exit 1; }

setup: check-prereq ## 의존성 설치, 환경변수 파일 생성
	@[ -f $(FE)/.env.local ] || cp $(FE)/.env.example $(FE)/.env.local
	pnpm --dir $(FE) install
	pnpm --dir $(CR) install

setup-agent: ## 에이전트 스킬 설치 (gstack). superpowers는 Claude Code가 프로젝트 설정으로 설치를 안내한다.
	@if [ -d $$HOME/.claude/skills/gstack ]; then echo "gstack 설치됨"; \
	else git clone --depth 1 https://github.com/garrytan/gstack.git $$HOME/.claude/skills/gstack && cd $$HOME/.claude/skills/gstack && ./setup; fi

dev:
	pnpm --dir $(FE) dev

crawl: ## 크롤링 후 frontend/src/data/에 JSON 저장
	pnpm --dir $(CR) crawl

fe-check:
	cd $(FE) && pnpm exec next typegen && pnpm exec tsc --noEmit && pnpm lint && pnpm format:check && pnpm test && pnpm build

fe-a11y: ## 빌드된 화면에서 글자 크기·터치 영역·대비·확대를 잰다
	cd $(FE) && pnpm build && pnpm a11y

crawler-check:
	pnpm --dir $(CR) typecheck
	pnpm --dir $(CR) test

gate: fe-check crawler-check
	@echo "GATE PASS"
