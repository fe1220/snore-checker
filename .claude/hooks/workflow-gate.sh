#!/usr/bin/env bash
# PreToolUse: 구현 코드 수정 전에 앞 단계 문서가 승인됐는지 확인한다.
# 승인 표시는 각 문서 첫 부분의 "상태: 승인" 한 줄이다. 사용자가 승인하면 메인 세션이 적는다.
# 현재 작업은 docs/work/ 아래 이름순 마지막 폴더다. 그 폴더의 spec.md·plan.md를 본다.
# frontend/src/* 는 docs/design-pass.md도 함께 본다. 작업 폴더가 없으면 막는다.
set -u
FILE=$(python3 -c 'import json,sys; print(json.load(sys.stdin).get("tool_input",{}).get("file_path",""))')
ROOT=$(git -C "$(dirname "$FILE")" rev-parse --show-toplevel 2>/dev/null) || exit 0

case "$FILE" in
  "$ROOT"/frontend/src/*) NEEDS_DESIGN=1 ;;
  "$ROOT"/crawler/src/*) NEEDS_DESIGN=0 ;;
  *) exit 0 ;;
esac

# 기획이 필요 없는 작업(버그 수정, 분석 도구 등)은 사용자가 이 파일을 만들어 게이트를 잠시 연다.
[ -f "$ROOT/.claude/gate-skip" ] && exit 0

WORK=$(cd "$ROOT" && ls -d docs/work/*/ 2>/dev/null | sort | tail -1)
WORK=${WORK%/}
if [ -z "$WORK" ]; then
  echo "워크플로우 게이트: docs/work/ 아래 작업 폴더가 없어 구현 코드를 수정할 수 없습니다." >&2
  echo "docs/work/NN-이름/ 에 spec.md·plan.md를 작성해 사용자 승인을 받고 문서에 '상태: 승인'을 적은 뒤 진행하세요." >&2
  exit 2
fi

REQUIRED="$WORK/spec.md $WORK/plan.md"
[ "$NEEDS_DESIGN" = 1 ] && REQUIRED="docs/design-pass.md $REQUIRED"

MISSING=""
for DOC in $REQUIRED; do
  grep -q "^상태: 승인" "$ROOT/$DOC" 2>/dev/null || MISSING="$MISSING $DOC"
done

if [ -n "$MISSING" ]; then
  echo "워크플로우 게이트: 승인되지 않은 문서가 있어 구현 코드를 수정할 수 없습니다:$MISSING" >&2
  echo "앞 단계 문서를 작성해 사용자 승인을 받고 문서에 '상태: 승인'을 적은 뒤 진행하세요." >&2
  exit 2
fi
exit 0
