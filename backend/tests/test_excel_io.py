# -*- coding: utf-8 -*-
"""Regression tests for app.utils.excel_io - format detection and reading.

Covers the v1.04.1 patch: a critical bug where legitimate .xls files
exported by ERP/MES "export to Excel" tools (which actually write an HTML
<table> with a .xls extension - Excel opens these transparently) were
rejected outright with "Unrecognized file format".
"""

from io import BytesIO

import openpyxl
import pytest

from app.utils.excel_io import (
    InvalidExcelFormatError,
    _looks_like_html,
    detect_excel_engine,
    read_raw_rows,
)


def test_detect_engine_xlsx(sample_xlsx_bytes):
    assert detect_excel_engine(sample_xlsx_bytes) == "openpyxl"


def test_detect_engine_rejects_garbage():
    with pytest.raises(InvalidExcelFormatError):
        detect_excel_engine(b"not an excel file at all")


def test_looks_like_html_true_for_html_table(sample_html_masquerading_as_xls_bytes):
    assert _looks_like_html(sample_html_masquerading_as_xls_bytes) is True


def test_looks_like_html_false_for_real_xlsx(sample_xlsx_bytes):
    assert _looks_like_html(sample_xlsx_bytes) is False


def test_read_raw_rows_xlsx(sample_xlsx_bytes):
    rows = read_raw_rows(sample_xlsx_bytes)
    assert ("AB000010_1", "TS#1_CardName", "CARD1") in rows


def test_read_raw_rows_html_masquerading_as_xls(sample_html_masquerading_as_xls_bytes):
    """The critical v1.04.1 regression: a .xls file that's actually an HTML
    table (common ERP/MES export pattern) must convert successfully, not
    raise "Unrecognized file format"."""
    rows = read_raw_rows(sample_html_masquerading_as_xls_bytes)
    assert ("AB000010_1", "TS#1_CardName", "CARD1") in rows


def test_read_raw_rows_html_without_table_raises_clean_error():
    html = b"<html><body><p>no table here</p></body></html>"
    with pytest.raises(InvalidExcelFormatError):
        read_raw_rows(html)


def test_read_raw_rows_extra_columns_ignored():
    """Feature 2 regression (V1.02): extra columns beyond PPID/Parameter/
    Reference Value must not break parsing."""
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.append(["PPID", "Parameter", "REF.xxx", "Operator", "Comment"])
    ws.append(["X1", "PPID", "X1", "op_a", "note"])
    ws.append(["X1", "TS#1_CardName", "CARD_X", "op_a", "note"])
    buf = BytesIO()
    wb.save(buf)

    rows = read_raw_rows(buf.getvalue())
    assert rows == [("X1", "PPID", "X1"), ("X1", "TS#1_CardName", "CARD_X")]
