# -*- coding: utf-8 -*-
"""Unit tests for the shared route error-handling policy (V1.08).

Extracted out of routes.py so the two-tier policy (expected rejection vs.
unexpected failure) can be verified directly, instead of only indirectly
through whichever route happens to exercise a given branch.
"""

import pytest
from fastapi import HTTPException

from app.api.error_handling import handle_route_errors
from app.utils.excel_io import InvalidExcelFormatError


def test_invalid_excel_format_error_becomes_400_with_its_own_message():
    with pytest.raises(HTTPException) as exc_info:
        with handle_route_errors("conversion"):
            raise InvalidExcelFormatError("bad input")

    assert exc_info.value.status_code == 400
    assert exc_info.value.detail == "bad input"


def test_explicit_http_exception_passes_through_unchanged():
    with pytest.raises(HTTPException) as exc_info:
        with handle_route_errors("export"):
            raise HTTPException(status_code=422, detail="deliberate validation failure")

    assert exc_info.value.status_code == 422
    assert exc_info.value.detail == "deliberate validation failure"


def test_unexpected_exception_uses_the_provided_status_and_message():
    with pytest.raises(HTTPException) as exc_info:
        with handle_route_errors("export", unexpected_status=400, unexpected_detail="could not export"):
            raise KeyError("boom")

    assert exc_info.value.status_code == 400
    assert exc_info.value.detail == "could not export"


def test_unexpected_exception_defaults_to_500_with_a_generated_message():
    with pytest.raises(HTTPException) as exc_info:
        with handle_route_errors("conversion"):
            raise KeyError("boom")

    assert exc_info.value.status_code == 500
    assert exc_info.value.detail == "An unexpected error occurred during conversion."


def test_no_exception_is_a_no_op():
    with handle_route_errors("conversion"):
        result = 1 + 1
    assert result == 2
