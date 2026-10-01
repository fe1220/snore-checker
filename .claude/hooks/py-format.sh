#!/usr/bin/env bash
# PostToolUse: 수정된 backend .py 파일을 ruff로 포맷/자동수정한다.
set -u
ROOT="${CLAUDE_PROJECT_DIR:-$(pwd)}"
FILE=$(python3 -c 'import json,sys; print(json.load(sys.stdin).get("tool_input",{}).get("file_path",""))')
case "$FILE" in
  "$ROOT"/backend/*.py) ;;
  *) exit 0 ;;
esac
RUFF="$ROOT/backend/.venv/bin/ruff"
[ -x "$RUFF" ] || { echo "backend/.venv 없음: make setup 실행 필요" >&2; exit 0; }
cd "$ROOT/backend"
"$RUFF" format -q "$FILE"
OUT=$("$RUFF" check --fix -q "$FILE" 2>&1) || { echo "ruff: $OUT" >&2; exit 2; }
exit 0
