# -*- coding: utf-8 -*-
"""Excel I/O helpers.

Everything here works purely in-memory (BytesIO) - no file is ever written
to disk, so there is nothing to clean up after a request completes.
"""

from io import BytesIO
from typing import Any

import pandas as pd


class InvalidExcelFormatError(ValueError):
    """Raised when the uploaded file cannot be parsed as the expected input."""


def read_raw_rows(file_bytes: bytes) -> list[tuple[Any, Any, Any]]:
    """Read the first worksheet of an uploaded .xlsx and return the
    (PPID, Parameter, Reference Value) columns as raw tuples.

    Production files may carry extra columns beyond the three that matter -
    those are located by header name (falling back to the original V1.01
    positional assumption when headers aren't recognizable) and everything
    else is ignored.
    """
    try:
        df = pd.read_excel(BytesIO(file_bytes), sheet_name=0, header=0, engine="openpyxl")
    except Exception as exc:  # noqa: BLE001 - surfaced as a clean 400 to the client
        raise InvalidExcelFormatError(f"Could not read uploaded file as Excel: {exc}") from exc

    ppid_col, parameter_col, value_col = _resolve_input_columns(df)
    subset = df[[ppid_col, parameter_col, value_col]]
    return list(subset.itertuples(index=False, name=None))


def _resolve_input_columns(df: pd.DataFrame) -> tuple[Any, Any, Any]:
    """Locate the PPID / Parameter / Reference Value columns.

    Preferred: match headers by name ("PPID", "Parameter", and a value
    column whose header mentions "ref" or "value") so extra/reordered
    columns in production exports don't break parsing.

    Fallback: the first three columns, positionally - this is exactly the
    V1.01 behavior, kept so files with non-standard or blank headers still
    work unchanged.
    """
    columns = list(df.columns)
    by_lower_name = {str(col).strip().lower(): col for col in columns}

    ppid_col = by_lower_name.get("ppid")
    parameter_col = by_lower_name.get("parameter")

    if ppid_col is not None and parameter_col is not None:
        remaining = [c for c in columns if c not in (ppid_col, parameter_col)]
        value_col = next(
            (c for c in remaining if "ref" in str(c).strip().lower() or "value" in str(c).strip().lower()),
            remaining[0] if remaining else None,
        )
        if value_col is not None:
            return ppid_col, parameter_col, value_col

    if len(columns) < 3:
        raise InvalidExcelFormatError(
            f"Expected at least 3 columns (PPID, Parameter, Reference Value), got {len(columns)}"
        )
    return columns[0], columns[1], columns[2]


def dataframe_to_xlsx_bytes(df: pd.DataFrame, sheet_name: str = "Converted") -> bytes:
    """Serialize a DataFrame to .xlsx bytes, entirely in memory."""
    buffer = BytesIO()
    with pd.ExcelWriter(buffer, engine="openpyxl") as writer:
        df.to_excel(writer, sheet_name=sheet_name, index=False)
    return buffer.getvalue()


def parse_pasted_text(text: str) -> list[tuple[Any, Any, Any]]:
    """Parse text copied out of Excel (Ctrl+C -> Ctrl+V) into raw
    (PPID, Parameter, Reference Value) rows.

    Excel separates columns with tabs when copying, so each line is split
    on "\\t". The first line is treated as the header row and skipped,
    matching the file-upload path (header=0) so both input methods behave
    the same way - the user should copy the header row along with the data.
    """
    lines = text.splitlines()
    if not lines:
        raise InvalidExcelFormatError("Pasted data is empty.")

    rows: list[tuple[Any, Any, Any]] = []
    for line in lines[1:]:
        if not line.strip():
            continue
        parts = line.split("\t")
        ppid = parts[0] if len(parts) > 0 else None
        parameter = parts[1] if len(parts) > 1 else None
        value = _to_number(parts[2]) if len(parts) > 2 else None
        rows.append((ppid, parameter, value))
    return rows


def _to_number(value: Any) -> Any:
    """Pasted values arrive as plain strings; convert numeric-looking ones
    to int/float so pasted input behaves the same as a file upload."""
    if not isinstance(value, str):
        return value
    text = value.strip()
    if text == "":
        return None
    try:
        return int(text)
    except ValueError:
        pass
    try:
        return float(text)
    except ValueError:
        return value
