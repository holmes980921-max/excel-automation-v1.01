# -*- coding: utf-8 -*-
"""Excel I/O helpers.

Everything here works purely in-memory (BytesIO) - no file is ever written
to disk, so there is nothing to clean up after a request completes.
"""

from io import BytesIO
from typing import Any, Literal

import pandas as pd

# File signatures used to detect the real format, independent of filename
# extension - a mislabeled or renamed file still gets read correctly, and a
# file that is neither is rejected with a clear error before pandas ever
# sees it.
_ZIP_SIGNATURE = b"PK\x03\x04"  # .xlsx / .xlsm (OOXML is a zip archive)
_OLE2_SIGNATURE = b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1"  # legacy .xls (OLE2 compound file)

# How many leading bytes to sniff for an HTML signature. Some export tools
# ("Export to Excel" in many ERP/MES systems) write an HTML <table> and give
# it a .xls extension - Excel opens these transparently (that's exactly why
# a real user would call this "a valid .xls file"), and Windows labels them
# "Microsoft Excel 97-2003 Worksheet" purely from the extension, even though
# the bytes are plain HTML, not OLE2. A short boilerplate/meta preamble
# before the first <table> is common, hence sniffing a window rather than
# just the first few bytes.
_HTML_SNIFF_WINDOW = 2048

ExcelEngine = Literal["openpyxl", "xlrd"]


class InvalidExcelFormatError(ValueError):
    """Raised when the uploaded file cannot be parsed as the expected input."""


def detect_excel_engine(file_bytes: bytes) -> ExcelEngine:
    """Pick the right pandas engine by sniffing the file's actual bytes.

    Trusting the filename extension isn't enough for "automatic format
    detection" - a renamed or mislabeled file would silently pick the wrong
    parser and fail confusingly. Reading the signature instead means legacy
    .xls and modern .xlsx/.xlsm both "just work" regardless of extension.
    """
    if file_bytes.startswith(_ZIP_SIGNATURE):
        return "openpyxl"
    if file_bytes.startswith(_OLE2_SIGNATURE):
        return "xlrd"
    raise InvalidExcelFormatError(
        "Unrecognized file format - only legacy .xls and modern .xlsx/.xlsm excel files are supported."
    )


def _looks_like_html(file_bytes: bytes) -> bool:
    head = file_bytes[:_HTML_SNIFF_WINDOW].lstrip(b"\xef\xbb\xbf").lstrip()
    head_lower = head.lower()
    return (
        head_lower.startswith(b"<html")
        or head_lower.startswith(b"<!doctype html")
        or b"<table" in head_lower[:_HTML_SNIFF_WINDOW]
    )


def _read_html_table(file_bytes: bytes) -> pd.DataFrame:
    """Reads the first <table> out of an HTML file that's masquerading as
    .xls (see _looks_like_html)."""
    try:
        # flavor="lxml" pins a single parser: without it, pandas silently
        # retries with html5lib/bs4 on any failure (including "no tables
        # found"), which can surface a confusing "missing html5lib" error
        # instead of the actual problem.
        tables = pd.read_html(BytesIO(file_bytes), header=0, flavor="lxml")
    except Exception as exc:  # noqa: BLE001 - surfaced as a clean 400 to the client
        raise InvalidExcelFormatError(f"Could not read uploaded file as Excel: {exc}") from exc
    if not tables:
        raise InvalidExcelFormatError("No table found in the uploaded file.")
    return tables[0]


def read_raw_rows(file_bytes: bytes, debug_info: dict[str, Any] | None = None) -> list[tuple[Any, Any, Any]]:
    """Read the first worksheet of an uploaded excel file (.xls, .xlsx/
    .xlsm, or an HTML table saved with a .xls extension - all
    auto-detected) and return the (PPID, Parameter, Reference Value)
    columns as raw tuples.

    Production files may carry extra columns beyond the three that matter -
    those are located by header name (falling back to the original V1.01
    positional assumption when headers aren't recognizable) and everything
    else is ignored.

    If `debug_info` is passed, it's populated with {"engine_used": ...} -
    used only by the opt-in Debug Mode response field; normal callers can
    ignore this parameter entirely.
    """
    if _looks_like_html(file_bytes):
        df = _read_html_table(file_bytes)
        if debug_info is not None:
            debug_info["engine_used"] = "html"
    else:
        fallback_engine = detect_excel_engine(file_bytes)  # also validates it's a real xlsx/xls signature
        df = _read_excel_binary(file_bytes, fallback_engine, debug_info)

    ppid_col, parameter_col, value_col = _resolve_input_columns(df)
    subset = df[[ppid_col, parameter_col, value_col]]
    return list(subset.itertuples(index=False, name=None))


def _read_excel_binary(
    file_bytes: bytes, fallback_engine: ExcelEngine, debug_info: dict[str, Any] | None = None
) -> pd.DataFrame:
    """Reads a binary .xlsx/.xlsm/.xls workbook, preferring calamine.

    calamine (Rust-based) reads this app's target scale (~300k rows) in
    ~2-3s versus ~20s for openpyxl - see the V1.05 performance benchmark
    report. Before adopting it as the default, it was validated to produce
    byte-and-type-identical output to openpyxl/xlrd across standard,
    large-scale, real-Excel-saved, Korean/CJK-text, numeric-value, and
    blank-cell scenarios (backend/tests/test_calamine_equivalence.py).

    Falls back to the original engine (openpyxl for .xlsx/.xlsm, xlrd for
    .xls) for any file calamine can't handle, so an edge case outside the
    validated scenarios degrades to the previously-shipped behavior instead
    of failing outright.
    """
    try:
        result = pd.read_excel(BytesIO(file_bytes), sheet_name=0, header=0, engine="calamine")
        if debug_info is not None:
            debug_info["engine_used"] = "calamine"
        return result
    except Exception:  # noqa: BLE001 - fall back before giving up
        pass

    # read_only streams rows instead of building openpyxl's full in-memory
    # workbook object model (styles, merged-cell metadata, ...) we never
    # use - meaningfully faster on large sheets even as a fallback path.
    # xlrd has no equivalent option (BIFF8/.xls is capped at 65,536 rows
    # anyway, so it was never the bottleneck at this app's target scale).
    engine_kwargs = {"read_only": True} if fallback_engine == "openpyxl" else {}
    try:
        result = pd.read_excel(
            BytesIO(file_bytes), sheet_name=0, header=0, engine=fallback_engine, engine_kwargs=engine_kwargs
        )
        if debug_info is not None:
            debug_info["engine_used"] = f"{fallback_engine} (calamine fallback)"
        return result
    except Exception as exc:  # noqa: BLE001 - surfaced as a clean 400 to the client
        raise InvalidExcelFormatError(f"Could not read uploaded file as Excel: {exc}") from exc


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


def _resolve_description_columns(df: pd.DataFrame) -> tuple[Any, Any]:
    """Locate the PPID / DESC columns in a description lookup file, by
    header name (case-insensitive) - same matching style as
    `_resolve_input_columns`, but both columns are required by name since
    a description file has no fixed positional shape to fall back on."""
    by_lower_name = {str(col).strip().lower(): col for col in df.columns}
    ppid_col = by_lower_name.get("ppid")
    desc_col = by_lower_name.get("desc") or by_lower_name.get("description")

    missing = [name for name, col in (("PPID", ppid_col), ("DESC", desc_col)) if col is None]
    if missing:
        raise InvalidExcelFormatError(
            f"Description file is missing required column(s): {', '.join(missing)}"
        )
    return ppid_col, desc_col


def read_description_file(file_bytes: bytes) -> pd.DataFrame:
    """Read a Description lookup file (PPID -> DESC) for the Add Description
    feature. Same format auto-detection as `read_raw_rows` (HTML-as-.xls,
    .xls, .xlsx/.xlsm, calamine-first). Returns a 2-column DataFrame with
    columns literally named "PPID" and "DESC", regardless of the source
    file's original header casing/wording.
    """
    if _looks_like_html(file_bytes):
        df = _read_html_table(file_bytes)
    else:
        fallback_engine = detect_excel_engine(file_bytes)
        df = _read_excel_binary(file_bytes, fallback_engine)

    ppid_col, desc_col = _resolve_description_columns(df)
    return df[[ppid_col, desc_col]].rename(columns={ppid_col: "PPID", desc_col: "DESC"})


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
