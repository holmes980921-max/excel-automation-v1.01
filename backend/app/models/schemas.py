# -*- coding: utf-8 -*-
"""Pydantic response/request models for the API layer."""

from typing import Any
from pydantic import BaseModel, Field


class ConvertTextRequest(BaseModel):
    """Body for the paste-from-clipboard conversion endpoint."""

    text: str


class TransformationRule(BaseModel):
    """A user-defined output shape: which columns to keep, in what order,
    and under what display name.

    Internal field names (the keys used in `output_columns`/`column_order`
    and the keys of `aliases`) are always the fixed V1.02 column names
    (PPID, TS#, CardName, ...) - only the *displayed/exported header text*
    changes via `aliases`. This keeps the rule fully decoupled from the
    transformation engine, which never changes.
    """

    rule_name: str = "Untitled Rule"
    output_columns: list[str] = Field(default_factory=list)
    column_order: list[str] = Field(default_factory=list)
    aliases: dict[str, str] = Field(default_factory=dict)


class ExportRequest(BaseModel):
    """Body for the stateless rule-shaped export endpoint.

    Carries the *already-converted* rows (as returned by /api/convert) plus
    a rule - no original excel file is needed, so re-exporting after a rule
    change never requires re-uploading anything.
    """

    filename: str = "converted.xlsx"
    rows: list[dict[str, Any]]
    rule: TransformationRule | None = None


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


class ExportResponse(BaseModel):
    filename: str
    file_base64: str


class ErrorResponse(BaseModel):
    detail: str
