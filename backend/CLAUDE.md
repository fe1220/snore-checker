# backend/CLAUDE.md

새 앱은 `apps/example`과 같은 모양으로 만든다. 예시 앱은 과제 시작 후 실제 도메인 앱이 생기면 삭제한다.

## 자주 어기는 규칙

- View에 비즈니스 로직을 넣지 않는다. 쓰기는 `services.py`, 조회는 `selectors.py`. Serializer는 검증과 변환만 한다.
- 비즈니스 규칙 위반은 `apps.core.exceptions.DomainError`(또는 `ConflictError`)를 raise한다. View에서 에러 Response를 직접 만들지 않는다.
- 다른 앱의 모델을 직접 수정하지 않는다. 그 앱의 service를 호출한다.
- 목록 조회는 연관 객체를 쓰면 `select_related`/`prefetch_related`를 붙인다.
- 여러 행/테이블에 쓰는 service는 `@transaction.atomic`.
- 테스트 데이터는 `tests/factories.py`의 factory로 만든다. service 테스트와 API 테스트를 둘 다 작성한다.
- 함수형 뷰, signal 기반 비즈니스 로직, raw SQL을 쓰지 않는다.
- 커스텀 액션이나 비표준 응답에는 `@extend_schema`를 붙인다. `spectacular --validate --fail-on-warn`가 통과해야 한다.

## 에이전트가 모르는 것

- 에러 응답 포맷은 항상 `{"code", "message", "fields"}`다. 프론트가 `code`로 분기하고 `message`를 그대로 사용자에게 보여주므로, `message`는 사용자용 한국어 문장으로 쓴다.
- `.py` 수정 시 훅이 ruff를 자동 실행하고, 턴 종료 시 마이그레이션 누락과 pytest를 검사한다. 훅 실패를 우회하지 말고 원인을 고친다.
