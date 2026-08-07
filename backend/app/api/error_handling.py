# -*- coding: utf-8 -*-
"""Shared route-level exception handling (V1.08).

Every route in routes.py needs the same two-tier policy: InvalidExcelFormatError
is an *expected* rejection (400, its own message shown to the user as-is,
logged at info level since it isn't a bug); anything else is *unexpected*
(logged at error level with the full traceback, the client sees only a
generic, route-appropriate message). Before V1.08 each route hand-rolled
this identically - and in two cases (convert_excel/convert_text), only
*part* of the route was covered, so an unexpected failure past that point
fell through to main.py's global handler with a different, less specific
message than the rest of the same route would have shown. Centralizing
this means the policy can only be inconsistent in one place instead of four.
"""

from collections.abc import Iterator
from contextlib import contextmanager

from fastapi import HTTPException

from app.utils.excel_io import InvalidExcelFormatError
from app.utils.logging_config import get_logger

app_log = get_logger("application")
error_log = get_logger("error")


@contextmanager
def handle_route_errors(
    operation: str, *, unexpected_status: int = 500, unexpected_detail: str | None = None
) -> Iterator[None]:
    """Wrap a route body with the standard two-tier error policy.

    - `InvalidExcelFormatError` -> 400, its own message, logged at info
      level (an expected rejection of bad input, not a server problem).
    - Any other exception -> `unexpected_status` (default 500) with a
      generic, route-appropriate message, logged at error level with the
      full traceback for debugging.
    - An `HTTPException` raised deliberately inside the block (e.g. a
      validation check with its own status code) always passes through
      unchanged - this wrapper only decides what *unhandled* exceptions
      become, never overrides an explicit one.
    """
    try:
        yield
    except InvalidExcelFormatError as exc:
        app_log.info("%s rejected: %s", operation, exc)
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001 - last line of defense, see main.py's global handler too
        error_log.error("Unexpected error during %s", operation, exc_info=exc)
        raise HTTPException(
            status_code=unexpected_status,
            detail=unexpected_detail or f"An unexpected error occurred during {operation}.",
        ) from exc
