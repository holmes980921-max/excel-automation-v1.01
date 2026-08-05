# -*- coding: utf-8 -*-
"""API layer - thin HTTP wrapper around ExcelTransformer.

No file is ever written to disk: the upload (or pasted text) is read into
memory, converted, and the result is returned inline as base64. Nothing
about the request is logged (see main.py logging config) and nothing is
persisted.
"""

import base64
import time
from dataclasses import asdict

import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException, UploadFile, File

from app.models.constants import FULL_OUTPUT_COLUMNS
from app.models.schemas import (
    ConversionSummaryModel,
    ConvertResponse,
    ConvertTextRequest,
    ExportRequest,
    ExportResponse,
)
from app.services.excel_transformer import ExcelTransformer
from app.services import rule_manager
from app.utils.excel_io import (
    InvalidExcelFormatError,
    dataframe_to_xlsx_bytes,
    parse_pasted_text,
    read_raw_rows,
)

router = APIRouter(prefix="/api", tags=["excel"])


def _output_filename(original_filename: str | None) -> str:
    stem = "converted"
    if original_filename:
        stem = original_filename.rsplit(".", 1)[0] or stem
    return f"{stem}_converted.xlsx"


def _build_response(
    transformer: ExcelTransformer, result_df: pd.DataFrame, filename: str, elapsed_seconds: float
) -> ConvertResponse:
    if result_df.empty:
        raise HTTPException(
            status_code=400,
            detail="No TS# data found. Check that the input matches the expected PPID/Parameter/Value format.",
        )

    summary = transformer.summarize(result_df, elapsed_seconds)
    output_bytes = dataframe_to_xlsx_bytes(result_df)
    rows_df = result_df.replace({np.nan: None})

    return ConvertResponse(
        filename=filename,
        columns=FULL_OUTPUT_COLUMNS,
        rows=rows_df.to_dict(orient="records"),
        total_rows=len(result_df),
        file_base64=base64.b64encode(output_bytes).decode("ascii"),
        summary=ConversionSummaryModel(**asdict(summary)),
    )


@router.post("/convert", response_model=ConvertResponse)
async def convert_excel(file: UploadFile = File(...)) -> ConvertResponse:
    if not file.filename or not file.filename.lower().endswith((".xlsx", ".xlsm", ".xls")):
        raise HTTPException(status_code=400, detail="Please upload a .xls, .xlsx, or .xlsm file.")

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    transformer = ExcelTransformer()
    start = time.perf_counter()
    try:
        raw_rows = read_raw_rows(file_bytes)
        result_df = transformer.transform(raw_rows)
    except InvalidExcelFormatError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    finally:
        # Nothing was written to disk, but drop the buffer reference promptly anyway.
        del file_bytes
    elapsed = time.perf_counter() - start

    return _build_response(transformer, result_df, _output_filename(file.filename), elapsed)


@router.post("/convert-text", response_model=ConvertResponse)
async def convert_text(payload: ConvertTextRequest) -> ConvertResponse:
    if not payload.text or not payload.text.strip():
        raise HTTPException(status_code=400, detail="Pasted data is empty.")

    transformer = ExcelTransformer()
    start = time.perf_counter()
    try:
        raw_rows = parse_pasted_text(payload.text)
        result_df = transformer.transform(raw_rows)
    except InvalidExcelFormatError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    elapsed = time.perf_counter() - start

    return _build_response(transformer, result_df, "pasted_converted.xlsx", elapsed)


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

    df = pd.DataFrame(payload.rows, columns=FULL_OUTPUT_COLUMNS)
    shaped = rule_manager.apply_rule(df, payload.rule)

    if shaped.df.shape[1] == 0:
        raise HTTPException(status_code=400, detail="The selected rule has no output columns.")

    renamed_df = shaped.df.copy()
    renamed_df.columns = shaped.headers

    output_bytes = dataframe_to_xlsx_bytes(renamed_df)
    filename = payload.filename if payload.filename.lower().endswith(".xlsx") else f"{payload.filename}.xlsx"

    return ExportResponse(filename=filename, file_base64=base64.b64encode(output_bytes).decode("ascii"))
