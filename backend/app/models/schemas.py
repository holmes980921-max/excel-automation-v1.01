# -*- coding: utf-8 -*-
"""Pydantic response/request models for the API layer."""

from typing import Any
from pydantic import BaseModel


class ConvertTextRequest(BaseModel):
    """Body for the paste-from-clipboard conversion endpoint."""

    text: str


class ConvertResponse(BaseModel):
    """Response returned after a successful conversion.

    The converted file is returned inline as base64 so the frontend never
    has to re-request a file from disk - nothing is persisted server-side.
    """

    filename: str
    columns: list[str]
    preview: list[dict[str, Any]]
    total_rows: int
    file_base64: str


class ErrorResponse(BaseModel):
    detail: str
