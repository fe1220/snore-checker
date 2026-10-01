#!/usr/bin/env bash
# PostToolUse: 수정된 frontend 파일을 prettier로 포맷한다.
# 루트는 $CLAUDE_PROJECT_DIR가 아니라 파일 위치에서 찾는다(워크트리에서는 메인 체크아웃을 가리키기 때문).
set -u
FILE=$(python3 -c 'import json,sys; print(json.load(sys.stdin).get("tool_input",{}).get("file_path",""))')
case "$FILE" in *.ts|*.tsx|*.js|*.jsx|*.mjs|*.css|*.json) ;; *) exit 0 ;; esac
ROOT=$(git -C "$(dirname "$FILE")" rev-parse --show-toplevel 2>/dev/null) || exit 0
case "$FILE" in
  "$ROOT"/frontend/*) ;;
  *) exit 0 ;;
esac
PRETTIER="$ROOT/frontend/node_modules/.bin/prettier"
[ -x "$PRETTIER" ] || { echo "frontend/node_modules 없음: make setup 실행 필요" >&2; exit 0; }
cd "$ROOT/frontend"
OUT=$("$PRETTIER" --write --log-level warn "$FILE" 2>&1) || { echo "prettier: $OUT" >&2; exit 2; }
exit 0
