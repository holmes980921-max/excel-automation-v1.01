# -*- coding: utf-8 -*-
"""Regression tests for the core transformation engine (unchanged since
V1.02 - these protect that invariant going forward)."""

from app.services.excel_transformer import ExcelTransformer
from app.utils.excel_io import read_raw_rows


def _transform(xlsx_bytes: bytes):
    return ExcelTransformer().transform(read_raw_rows(xlsx_bytes))


def test_ts_label_format(sample_xlsx_bytes):
    df = _transform(sample_xlsx_bytes)
    assert set(df["TS#"]) == {"TS#1", "TS#2"}


def test_missing_values_filled_with_dash(sample_xlsx_bytes):
    df = _transform(sample_xlsx_bytes)
    row = df[(df.PPID == "AB000010_1") & (df["TS#"] == "TS#2")].iloc[0]
    assert row["CardName"] == "-"
    assert row["FilmMaterial"] == "FILM2"


def test_every_ppid_preserved_no_duplicates(sample_xlsx_bytes):
    df = _transform(sample_xlsx_bytes)
    assert set(df["PPID"]) == {"AB000010_1", "AB000020_1"}
    assert not df.duplicated(subset=["PPID", "TS#"]).any()


def test_unsupported_parameters_and_out_of_range_ts_ignored():
    import openpyxl
    from io import BytesIO

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.append(["PPID", "Parameter", "REF.xxx"])
    ws.append(["Y1", "PPID", "Y1"])
    ws.append(["Y1", "Comment", "should be ignored"])
    ws.append(["Y1", "TS#11_CardName", "too far, must be ignored"])
    ws.append(["Y1", "TS#1_CardName", "CARD_Y"])
    buf = BytesIO()
    wb.save(buf)

    df = _transform(buf.getvalue())
    assert len(df) == 1
    assert df.iloc[0]["CardName"] == "CARD_Y"
    assert df.iloc[0]["TS#"] == "TS#1"
