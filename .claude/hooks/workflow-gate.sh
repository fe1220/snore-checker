#!/usr/bin/env bash
# PreToolUse: 구현 코드 수정 전에 앞 단계 문서가 승인됐는지 확인한다.
# 승인 표시는 각 문서 첫 부분의 "상태: 승인" 한 줄이다. 사용자가 승인하면 메인 세션이 적는다.
set -u
FILE=$(python3 -c 'import json,sys; print(json.load(sys.stdin).get("tool_input",{}).get("file_path",""))')
ROOT=$(git -C "$(dirname "$FILE")" rev-parse --show-toplevel 2>/dev/null) || exit 0

case "$FILE" in
  "$ROOT"/frontend/src/*) REQUIRED="02-design-pass 03-tech-spec 04-plan" ;;
  "$ROOT"/crawler/src/*) REQUIRED="03-tech-spec 04-plan" ;;
  *) exit 0 ;;
esac

MISSING=""
for DOC in $REQUIRED; do
  grep -q "^상태: 승인" "$ROOT/docs/$DOC.md" 2>/dev/null || MISSING="$MISSING docs/$DOC.md"
done

if [ -n "$MISSING" ]; then
  echo "워크플로우 게이트: 승인되지 않은 문서가 있어 구현 코드를 수정할 수 없습니다:$MISSING" >&2
  echo "앞 단계 문서를 작성해 사용자 승인을 받고 문서에 '상태: 승인'을 적은 뒤 진행하세요." >&2
  exit 2
fi
exit 0
