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
    """Read the first worksheet of an uploaded .xlsx and return the first
    three columns (PPID, Parameter, Reference Value) as raw tuples.

    The header row (row 1) is skipped by pandas automatically. Column
    position is used rather than column name, since the header text
    ("REF.xxx" in the spec example) is not guaranteed to be stable.
    """
    try:
        df = pd.read_excel(BytesIO(file_bytes), sheet_name=0, header=0, engine="openpyxl")
    except Exception as exc:  # noqa: BLE001 - surfaced as a clean 400 to the client
        raise InvalidExcelFormatError(f"Could not read uploaded file as Excel: {exc}") from exc

    if df.shape[1] < 3:
        raise InvalidExcelFormatError(
            f"Expected at least 3 columns (PPID, Parameter, Reference Value), got {df.shape[1]}"
        )

    first_three = df.iloc[:, :3]
    return list(first_three.itertuples(index=False, name=None))


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
