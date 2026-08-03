# -*- coding: utf-8 -*-
"""API layer - thin HTTP wrapper around ExcelTransformer.

No file is ever written to disk: the upload (or pasted text) is read into
memory, converted, and the result is returned inline as base64. Nothing
about the request is logged (see main.py logging config) and nothing is
persisted.
"""

import base64

import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException, UploadFile, File

from app.models.constants import FULL_OUTPUT_COLUMNS
from app.models.schemas import ConvertResponse, ConvertTextRequest
from app.services.excel_transformer import ExcelTransformer
from app.utils.excel_io import (
    InvalidExcelFormatError,
    dataframe_to_xlsx_bytes,
    parse_pasted_text,
    read_raw_rows,
)

router = APIRouter(prefix="/api", tags=["excel"])

PREVIEW_ROW_LIMIT = 50


def _output_filename(original_filename: str | None) -> str:
    stem = "converted"
    if original_filename:
        stem = original_filename.rsplit(".", 1)[0] or stem
    return f"{stem}_converted.xlsx"


def _build_response(result_df: pd.DataFrame, filename: str) -> ConvertResponse:
    if result_df.empty:
        raise HTTPException(
            status_code=400,
            detail="No TS# data found. Check that the input matches the expected PPID/Parameter/Value format.",
        )

    output_bytes = dataframe_to_xlsx_bytes(result_df)
    preview_df = result_df.head(PREVIEW_ROW_LIMIT).replace({np.nan: None})

    return ConvertResponse(
        filename=filename,
        columns=FULL_OUTPUT_COLUMNS,
        preview=preview_df.to_dict(orient="records"),
        total_rows=len(result_df),
        file_base64=base64.b64encode(output_bytes).decode("ascii"),
    )


@router.post("/convert", response_model=ConvertResponse)
async def convert_excel(file: UploadFile = File(...)) -> ConvertResponse:
    if not file.filename or not file.filename.lower().endswith((".xlsx", ".xlsm")):
        raise HTTPException(status_code=400, detail="Please upload a .xlsx file.")

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    try:
        raw_rows = read_raw_rows(file_bytes)
        result_df = ExcelTransformer().transform(raw_rows)
    except InvalidExcelFormatError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    finally:
        # Nothing was written to disk, but drop the buffer reference promptly anyway.
        del file_bytes

    return _build_response(result_df, _output_filename(file.filename))


@router.post("/convert-text", response_model=ConvertResponse)
async def convert_text(payload: ConvertTextRequest) -> ConvertResponse:
    if not payload.text or not payload.text.strip():
        raise HTTPException(status_code=400, detail="Pasted data is empty.")

    try:
        raw_rows = parse_pasted_text(payload.text)
        result_df = ExcelTransformer().transform(raw_rows)
    except InvalidExcelFormatError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return _build_response(result_df, "pasted_converted.xlsx")
