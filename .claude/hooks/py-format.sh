#!/usr/bin/env bash
# PostToolUse: 수정된 backend .py 파일을 ruff로 포맷/자동수정한다.
# 루트는 $CLAUDE_PROJECT_DIR가 아니라 파일 위치에서 찾는다(워크트리에서는 메인 체크아웃을 가리키기 때문).
set -u
FILE=$(python3 -c 'import json,sys; print(json.load(sys.stdin).get("tool_input",{}).get("file_path",""))')
case "$FILE" in *.py) ;; *) exit 0 ;; esac
ROOT=$(git -C "$(dirname "$FILE")" rev-parse --show-toplevel 2>/dev/null) || exit 0
case "$FILE" in
  "$ROOT"/backend/*) ;;
  *) exit 0 ;;
esac
RUFF="$ROOT/backend/.venv/bin/ruff"
[ -x "$RUFF" ] || { echo "backend/.venv 없음: make setup 실행 필요" >&2; exit 0; }
cd "$ROOT/backend"
"$RUFF" format -q "$FILE"
OUT=$("$RUFF" check --fix -q "$FILE" 2>&1) || { echo "ruff: $OUT" >&2; exit 2; }
exit 0
