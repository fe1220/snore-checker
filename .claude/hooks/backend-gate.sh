#!/usr/bin/env bash
# Stop: backend 변경이 있으면 마이그레이션 누락과 테스트를 확인한다.
# 실패 시 1회 턴 종료를 막고 수정하게 한다. 재시도에서도 실패하면 경고만 남긴다(무한 반복 방지).
set -u
# 루트는 $CLAUDE_PROJECT_DIR가 아니라 세션 cwd에서 찾는다(워크트리에서는 메인 체크아웃을 가리키기 때문).
INPUT=$(cat)
ACTIVE=$(printf '%s' "$INPUT" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("stop_hook_active", False))')
CWD=$(printf '%s' "$INPUT" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("cwd", ""))')

ROOT=$(git -C "${CWD:-$(pwd)}" rev-parse --show-toplevel 2>/dev/null) || exit 0
cd "$ROOT"
[ -n "$(git status --porcelain -- backend)" ] || exit 0

PY="$ROOT/backend/.venv/bin/python"
[ -x "$PY" ] || exit 0
cd "$ROOT/backend"

FAIL=""
"$PY" manage.py makemigrations --check --dry-run >/tmp/backend-gate-mig.log 2>&1 \
  || FAIL="마이그레이션 누락: makemigrations 실행 필요\n$(tail -5 /tmp/backend-gate-mig.log)"
if ! "$ROOT/backend/.venv/bin/pytest" -q -x >/tmp/backend-gate-test.log 2>&1; then
  FAIL="$FAIL\npytest 실패:\n$(tail -20 /tmp/backend-gate-test.log)"
fi

[ -z "$FAIL" ] && exit 0
if [ "$ACTIVE" = "True" ]; then
  printf "backend gate 여전히 실패 (사용자 확인 필요):\n%b\n" "$FAIL" >&2
  exit 0
fi
python3 -c 'import json,sys; print(json.dumps({"decision":"block","reason":"backend gate 실패. 원인을 고친 뒤 종료하세요.\n"+sys.argv[1]}))' "$(printf '%b' "$FAIL")"
