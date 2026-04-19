from __future__ import annotations

import hmac
import os
from typing import Any

OPERATOR_API_TOKEN_ENV = 'LATINUM_BOARD_API_TOKEN'
OPERATOR_API_TOKEN_HEADER = 'x-latinum-board-token'


def _timing_safe_equal(left: str, right: str) -> bool:
    return hmac.compare_digest(left.encode(), right.encode())


def validate_request_token(headers: Any) -> tuple[bool, tuple[dict[str, object], int] | None]:
    expected = os.environ.get(OPERATOR_API_TOKEN_ENV, '').strip()
    if not expected:
        return False, ({'success': False, 'message': f'Server misconfigured: missing {OPERATOR_API_TOKEN_ENV}'}, 503)

    provided = ''
    if headers is not None:
        provided = str(headers.get(OPERATOR_API_TOKEN_HEADER, '')).strip()

    if not provided or not _timing_safe_equal(provided, expected):
        return False, ({'success': False, 'message': 'Unauthorized'}, 401)

    return True, None
