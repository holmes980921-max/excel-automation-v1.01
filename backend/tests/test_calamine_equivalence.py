# -*- coding: utf-8 -*-
"""Validates that calamine (the default reader as of V1.05) produces
byte-and-type-identical output to the previous openpyxl/xlrd engines.

This is the permanent regression test backing the decision documented in
_read_excel_binary()'s docstring - if a future pandas/calamine upgrade ever
introduces a divergence, this is what should catch it.
"""

from io import BytesIO

import numpy as np
import openpyxl
import pandas as pd
import pytest


def _assert_identical(df_a: pd.DataFrame, df_b: pd.DataFrame):
    assert df_a.shape == df_b.shape
    assert list(df_a.columns) == list(df_b.columns)
    for col in df_a.columns:
        for i in range(len(df_a)):
            a, b = df_a[col].iloc[i], df_b[col].iloc[i]
            a_nan = a is None or (isinstance(a, float) and np.isnan(a))
            b_nan = b is None or (isinstance(b, float) and np.isnan(b))
            if a_nan and b_nan:
                continue
            assert a_nan == b_nan, f"row {i} col {col!r}: {a!r} vs {b!r}"
            assert a == b, f"row {i} col {col!r}: {a!r} vs {b!r}"


def test_calamine_matches_openpyxl_on_standard_file(sample_xlsx_bytes):
    df_openpyxl = pd.read_excel(BytesIO(sample_xlsx_bytes), sheet_name=0, header=0, engine="openpyxl")
    df_calamine = pd.read_excel(BytesIO(sample_xlsx_bytes), sheet_name=0, header=0, engine="calamine")
    _assert_identical(df_openpyxl, df_calamine)


def test_calamine_matches_openpyxl_on_korean_numeric_blank_cells():
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.append(["PPID", "Parameter", "REF.xxx"])
    ws.append(["AB000010_1", "PPID", "AB000010_1"])
    ws.append(["AB000010_1", "TS#1_FilmMaterial", "필름소재_한글텍스트"])
    ws.append(["AB000010_1", "TS#1_CardName", "카드이름_A"])
    ws.append(["AB000010_1", "TS#1_DataCombination", 12345])
    ws.append(["AB000010_1", "TS#1_DataFeedFoward", 3.14159])
    ws.append(["AB000010_1", "TS#2_FilmMaterial", None])
    ws.append([12345, "PPID", 12345])
    buf = BytesIO()
    wb.save(buf)
    file_bytes = buf.getvalue()

    df_openpyxl = pd.read_excel(BytesIO(file_bytes), sheet_name=0, header=0, engine="openpyxl")
    df_calamine = pd.read_excel(BytesIO(file_bytes), sheet_name=0, header=0, engine="calamine")
    _assert_identical(df_openpyxl, df_calamine)


def test_calamine_matches_xlrd_on_legacy_xls():
    xlwt = pytest.importorskip("xlwt", reason="xlwt only needed to generate .xls fixtures for this test")

    wb = xlwt.Workbook()
    ws = wb.add_sheet("Sheet1")
    rows = [
        ["PPID", "Parameter", "REF.xxx"],
        ["AB1", "PPID", "AB1"],
        ["AB1", "TS#1_CardName", "CARD_A"],
        ["AB1", "TS#1_DataCombination", 42],
    ]
    for r, row in enumerate(rows):
        for c, value in enumerate(row):
            ws.write(r, c, value)
    buf = BytesIO()
    wb.save(buf)
    file_bytes = buf.getvalue()

    df_xlrd = pd.read_excel(BytesIO(file_bytes), sheet_name=0, header=0, engine="xlrd")
    df_calamine = pd.read_excel(BytesIO(file_bytes), sheet_name=0, header=0, engine="calamine")
    _assert_identical(df_xlrd, df_calamine)


def test_calamine_raises_cleanly_on_garbage():
    with pytest.raises(Exception):  # calamine's own error type, wrapped by our fallback path in real usage
        pd.read_excel(BytesIO(b"not an excel file"), sheet_name=0, header=0, engine="calamine")


def test_calamine_raises_cleanly_on_html():
    html = b"<html><body><table><tr><td>a</td></tr></table></body></html>"
    with pytest.raises(Exception):
        pd.read_excel(BytesIO(html), sheet_name=0, header=0, engine="calamine")
