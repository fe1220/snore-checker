from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.views import exception_handler as drf_exception_handler


class DomainError(Exception):
    """비즈니스 규칙 위반. service에서 raise하면 일관된 에러 응답으로 변환된다."""

    status_code = status.HTTP_400_BAD_REQUEST

    def __init__(self, code: str, message: str):
        self.code = code
        self.message = message
        super().__init__(message)


class ConflictError(DomainError):
    status_code = status.HTTP_409_CONFLICT


def exception_handler(exc, context):
    """모든 에러를 {"code", "message", "fields"} 형태로 통일한다."""
    if isinstance(exc, DomainError):
        from rest_framework.response import Response

        return Response(
            {"code": exc.code, "message": exc.message, "fields": {}},
            status=exc.status_code,
        )

    response = drf_exception_handler(exc, context)
    if response is None:
        return None

    if isinstance(exc, ValidationError):
        response.data = {
            "code": "invalid_input",
            "message": "입력값을 확인해 주세요.",
            "fields": response.data if isinstance(response.data, dict) else {},
        }
    else:
        response.data = {
            "code": getattr(exc, "default_code", "error"),
            "message": str(getattr(exc, "detail", exc)),
            "fields": {},
        }
    return response
