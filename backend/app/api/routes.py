# -*- coding: utf-8 -*-
"""API layer - thin HTTP wrapper around ExcelTransformer.

No file is ever written to disk: the upload (or pasted text) is read into
memory, converted, and the result is returned inline. Nothing about the
request is logged beyond structural facts (see app/utils/logging_config.py)
- excel contents are never written to a log line.
"""

import base64
import json
import time
from dataclasses import asdict

import numpy as np
import pandas as pd
from fastapi import APIRouter, Form, HTTPException, Query, UploadFile, File

from app.models.constants import FULL_OUTPUT_COLUMNS
from app.models.schemas import (
    AddDescriptionResponse,
    ConversionSummaryModel,
    ConvertResponse,
    ConvertTextRequest,
    DebugInfo,
    ExportRequest,
    ExportResponse,
)
from app.services.description_merger import merge_description
from app.services.excel_transformer import ExcelTransformer
from app.services import rule_manager
from app.utils.excel_io import (
    InvalidExcelFormatError,
    dataframe_to_xlsx_bytes,
    parse_pasted_text,
    read_description_file,
    read_raw_rows,
)
from app.utils.logging_config import get_logger
from app.utils.perf import PeakMemorySampler

router = APIRouter(prefix="/api", tags=["excel"])

app_log = get_logger("application")
error_log = get_logger("error")
perf_log = get_logger("performance")

# Generous but finite: without a cap, `await file.read()` would happily try
# to load an arbitrarily large upload entirely into memory, which is a real
# crash/OOM risk (not just a slow request) - see the V1.05 reliability
# review. 300k rows of the app's typical row width lands well under this.
MAX_UPLOAD_SIZE_BYTES = 250 * 1024 * 1024  # 250 MB


def _output_filename(original_filename: str | None) -> str:
    stem = "converted"
    if original_filename:
        stem = original_filename.rsplit(".", 1)[0] or stem
    return f"{stem}_converted.xlsx"


def _build_response(
    transformer: ExcelTransformer,
    result_df: pd.DataFrame,
    filename: str,
    stages_seconds: dict[str, float],
    debug: bool,
    debug_extra: dict[str, object],
    peak_memory_mb: float | None,
) -> ConvertResponse:
    if result_df.empty:
        raise InvalidExcelFormatError(
            "No TS# data found. Check that the input matches the expected PPID/Parameter/Value format."
        )

    total_seconds = sum(stages_seconds.values())
    summary = transformer.summarize(result_df, total_seconds)
    # A source cell can be blank for an otherwise-present TS# field, which
    # surfaces here as a real NaN (not just a missing key) - swap to None so
    # the JSON response is valid (a bare NaN token isn't legal JSON).
    rows_df = result_df.replace({np.nan: None})

    debug_info = None
    if debug:
        debug_info = DebugInfo(
            stages_seconds={k: round(v, 3) for k, v in stages_seconds.items()},
            total_seconds=round(total_seconds, 3),
            peak_memory_mb=round(peak_memory_mb, 1) if peak_memory_mb is not None else 0.0,
            engine_used=str(debug_extra.get("engine_used", "unknown")),
        )

    return ConvertResponse(
        filename=filename,
        columns=FULL_OUTPUT_COLUMNS,
        rows=rows_df.to_dict(orient="records"),
        total_rows=len(result_df),
        summary=ConversionSummaryModel(**asdict(summary)),
        debug=debug_info,
    )


@router.post("/convert", response_model=ConvertResponse)
async def convert_excel(
    file: UploadFile = File(...),
    debug: bool = Query(False, description="Include timing/memory/engine diagnostics in the response."),
) -> ConvertResponse:
    if not file.filename or not file.filename.lower().endswith((".xlsx", ".xlsm", ".xls")):
        raise HTTPException(status_code=400, detail="Please upload a .xls, .xlsx, or .xlsm file.")

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    if len(file_bytes) > MAX_UPLOAD_SIZE_BYTES:
        size_mb = len(file_bytes) / (1024 * 1024)
        limit_mb = MAX_UPLOAD_SIZE_BYTES / (1024 * 1024)
        app_log.warning("Rejected oversized upload: %.1f MB (limit %.0f MB)", size_mb, limit_mb)
        raise HTTPException(
            status_code=413,
            detail=f"File is too large ({size_mb:.0f} MB). The limit is {limit_mb:.0f} MB.",
        )

    app_log.info("Conversion requested: %.2f MB file", len(file_bytes) / (1024 * 1024))

    debug_extra: dict[str, object] = {}
    stages: dict[str, float] = {}
    transformer = ExcelTransformer()
    try:
        with PeakMemorySampler() as sampler:
            t0 = time.perf_counter()
            raw_rows = read_raw_rows(file_bytes, debug_info=debug_extra if debug else None)
            t1 = time.perf_counter()
            stages["read_and_parse"] = t1 - t0

            result_df = transformer.transform(raw_rows)
            t2 = time.perf_counter()
            stages["transform"] = t2 - t1
        peak_mb = sampler.peak_mb
    except InvalidExcelFormatError as exc:
        app_log.info("Conversion rejected (invalid format): %s", exc)
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001 - last line of defense, see main.py's handler too
        error_log.error("Unexpected error during conversion", exc_info=exc)
        raise HTTPException(
            status_code=500, detail="An unexpected error occurred while processing your file."
        ) from exc
    finally:
        # Nothing was written to disk, but drop the buffer reference promptly anyway.
        del file_bytes

    try:
        response = _build_response(
            transformer, result_df, _output_filename(file.filename), stages, debug, debug_extra, peak_mb
        )
    except InvalidExcelFormatError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    perf_log.info(
        "Conversion completed: %d rows -> %d rows in %.2fs (%.1f MB peak)",
        len(raw_rows),
        response.total_rows,
        sum(stages.values()),
        peak_mb,
    )
    return response


@router.post("/convert-text", response_model=ConvertResponse)
async def convert_text(
    payload: ConvertTextRequest,
    debug: bool = Query(False, description="Include timing/memory/engine diagnostics in the response."),
) -> ConvertResponse:
    if not payload.text or not payload.text.strip():
        raise HTTPException(status_code=400, detail="Pasted data is empty.")

    app_log.info("Conversion requested: pasted text (%d chars)", len(payload.text))

    stages: dict[str, float] = {}
    transformer = ExcelTransformer()
    try:
        with PeakMemorySampler() as sampler:
            t0 = time.perf_counter()
            raw_rows = parse_pasted_text(payload.text)
            t1 = time.perf_counter()
            stages["read_and_parse"] = t1 - t0

            result_df = transformer.transform(raw_rows)
            t2 = time.perf_counter()
            stages["transform"] = t2 - t1
        peak_mb = sampler.peak_mb
    except InvalidExcelFormatError as exc:
        app_log.info("Conversion rejected (invalid format): %s", exc)
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        error_log.error("Unexpected error during paste conversion", exc_info=exc)
        raise HTTPException(
            status_code=500, detail="An unexpected error occurred while processing your data."
        ) from exc

    try:
        response = _build_response(
            transformer, result_df, "pasted_converted.xlsx", stages, debug, {"engine_used": "paste"}, peak_mb
        )
    except InvalidExcelFormatError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    perf_log.info(
        "Paste conversion completed: %d rows -> %d rows in %.2fs", len(raw_rows), response.total_rows, sum(stages.values())
    )
    return response


@router.post("/export", response_model=ExportResponse)
async def export_rows(payload: ExportRequest) -> ExportResponse:
    """Re-export already-converted rows shaped by a TransformationRule.

    Stateless: takes the rows the client already has (from a prior
    /api/convert or /api/convert-text call) plus a rule, and produces a
    freshly shaped .xlsx. No original file re-upload is ever needed just
    because a rule changed.
    """
    if not payload.rows:
        raise HTTPException(status_code=400, detail="No rows to export.")

    try:
        raw_df = pd.DataFrame(payload.rows)
        has_desc = "DESC" in raw_df.columns
        df = raw_df.reindex(columns=FULL_OUTPUT_COLUMNS)
        shaped = rule_manager.apply_rule(df, payload.rule)

        if shaped.df.shape[1] == 0:
            raise HTTPException(status_code=400, detail="The selected rule has no output columns.")

        # shaped.df's columns are still the internal (pre-alias) names here -
        # find PPID's position before renaming so DESC can be inserted right
        # after it, matching the Preview grid exactly (V1.07: "Preview =
        # Export"). Falls back to appending at the end if PPID isn't part of
        # the active rule's output columns (no natural anchor to insert after).
        ppid_position = (
            list(shaped.df.columns).index("PPID") + 1 if "PPID" in shaped.df.columns else shaped.df.shape[1]
        )

        renamed_df = shaped.df.copy()
        renamed_df.columns = shaped.headers
        # DESC (V1.06 Add Description) sits outside the fixed rule column
        # set entirely - once added, it always rides along on export
        # regardless of which rule is active, since it isn't a
        # rule-shapeable field.
        if has_desc:
            renamed_df.insert(ppid_position, "DESC", raw_df["DESC"].to_numpy())

        output_bytes = dataframe_to_xlsx_bytes(renamed_df)
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001 - malformed client-supplied `rows`/`rule` shouldn't 500 opaquely
        error_log.error("Unexpected error during export", exc_info=exc)
        raise HTTPException(
            status_code=400, detail="Could not export the provided data - it may be malformed."
        ) from exc

    filename = payload.filename if payload.filename.lower().endswith(".xlsx") else f"{payload.filename}.xlsx"
    app_log.info("Export completed: %d rows, %.2f MB", len(renamed_df), len(output_bytes) / (1024 * 1024))

    return ExportResponse(filename=filename, file_base64=base64.b64encode(output_bytes).decode("ascii"))


@router.post("/add-description", response_model=AddDescriptionResponse)
async def add_description(
    file: UploadFile = File(...),
    rows: str = Form(..., description="JSON-encoded list of already-converted row objects."),
) -> AddDescriptionResponse:
    """Merge a DESC column onto already-converted rows by PPID (V1.06).

    Stateless, same shape as /api/export: the client sends back the rows it
    already has plus a Description lookup file; nothing is persisted
    server-side. Always merge against the *original* converted rows (not a
    previously-merged result) so re-running with a different description
    file never stacks DESC values.
    """
    if not file.filename or not file.filename.lower().endswith((".xlsx", ".xlsm", ".xls")):
        raise HTTPException(status_code=400, detail="Please upload a .xls, .xlsx, or .xlsm file.")

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    if len(file_bytes) > MAX_UPLOAD_SIZE_BYTES:
        size_mb = len(file_bytes) / (1024 * 1024)
        limit_mb = MAX_UPLOAD_SIZE_BYTES / (1024 * 1024)
        app_log.warning("Rejected oversized description upload: %.1f MB (limit %.0f MB)", size_mb, limit_mb)
        raise HTTPException(
            status_code=413,
            detail=f"File is too large ({size_mb:.0f} MB). The limit is {limit_mb:.0f} MB.",
        )

    try:
        rows_data = json.loads(rows)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="Row data is malformed.") from exc
    if not isinstance(rows_data, list) or not rows_data:
        raise HTTPException(status_code=400, detail="No rows to merge.")

    try:
        desc_df = read_description_file(file_bytes)
        rows_df = pd.DataFrame(rows_data)
        result = merge_description(rows_df, desc_df)
    except InvalidExcelFormatError as exc:
        app_log.info("Add Description rejected: %s", exc)
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:  # noqa: BLE001 - malformed client-supplied `rows` shouldn't 500 opaquely
        error_log.error("Unexpected error during description merge", exc_info=exc)
        raise HTTPException(
            status_code=400, detail="Could not merge the description file - it may be malformed."
        ) from exc
    finally:
        del file_bytes

    result_rows = result.df.replace({np.nan: None}).to_dict(orient="records")
    app_log.info(
        "Add Description completed: %d matched, %d unmatched PPIDs",
        result.matched_count,
        result.unmatched_count,
    )

    return AddDescriptionResponse(
        columns=list(result.df.columns),  # DESC already inserted right after PPID by merge_description()
        rows=result_rows,
        total_rows=len(result_rows),
        matched_count=result.matched_count,
        unmatched_count=result.unmatched_count,
        unmatched_ppids=result.unmatched_ppids,
    )
