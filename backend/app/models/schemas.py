# -*- coding: utf-8 -*-
"""Pydantic response/request models for the API layer."""

from typing import Any
from pydantic import BaseModel


class ConvertTextRequest(BaseModel):
    """Body for the paste-from-clipboard conversion endpoint."""

    text: str


class ConversionSummaryModel(BaseModel):
    """Post-conversion stats shown in the UI summary panel."""

    ppid_count: int
    ts_count: int
    generated_rows: int
    conversion_time_seconds: float


class ConvertResponse(BaseModel):
    """Response returned after a successful conversion.

    The converted file is returned inline as base64 so the frontend never
    has to re-request a file from disk - nothing is persisted server-side.
    `rows` carries the *entire* converted dataset (not just a preview slice)
    so client-side search/sort in the UI has the full data to work with
    without any further API requests.
    """

    filename: str
    columns: list[str]
    rows: list[dict[str, Any]]
    total_rows: int
    file_base64: str
    summary: ConversionSummaryModel


class ErrorResponse(BaseModel):
    detail: str
