# -*- coding: utf-8 -*-
"""Unit tests for the V1.06 Add Description feature: reading a description
lookup file and left-joining its DESC column onto already-converted rows.
"""

from io import BytesIO

import openpyxl
import pandas as pd
import pytest

from app.services.description_merger import merge_description
from app.utils.excel_io import InvalidExcelFormatError, read_description_file


def _build_xlsx(rows: list[list]) -> bytes:
    wb = openpyxl.Workbook()
    ws = wb.active
    for row in rows:
        ws.append(row)
    buf = BytesIO()
    wb.save(buf)
    return buf.getvalue()


def _rows_df() -> pd.DataFrame:
    return pd.DataFrame(
        [
            {"PPID": "AB000010_1", "TS#": "TS#1", "CardName": "CARD1"},
            {"PPID": "AB000010_1", "TS#": "TS#2", "CardName": "CARD1"},
            {"PPID": "AB000020_1", "TS#": "TS#1", "CardName": "CARDX"},
        ]
    )


def test_read_description_file_resolves_columns_by_name():
    xlsx = _build_xlsx([["PPID", "DESC"], ["AB000010_1", "First PPID"], ["AB000020_1", "Second PPID"]])
    df = read_description_file(xlsx)
    assert list(df.columns) == ["PPID", "DESC"]
    assert df.shape[0] == 2


def test_read_description_file_accepts_description_header_alias():
    xlsx = _build_xlsx([["PPID", "Description"], ["AB000010_1", "First PPID"]])
    df = read_description_file(xlsx)
    assert list(df.columns) == ["PPID", "DESC"]


def test_read_description_file_rejects_missing_columns():
    xlsx = _build_xlsx([["PPID", "Notes"], ["AB000010_1", "irrelevant"]])
    with pytest.raises(InvalidExcelFormatError, match="DESC"):
        read_description_file(xlsx)


def test_merge_adds_desc_to_every_matching_row():
    desc_df = pd.DataFrame({"PPID": ["AB000010_1", "AB000020_1"], "DESC": ["First PPID", "Second PPID"]})
    result = merge_description(_rows_df(), desc_df)

    assert result.df["DESC"].tolist() == ["First PPID", "First PPID", "Second PPID"]
    assert result.matched_count == 2
    assert result.unmatched_count == 0
    assert result.unmatched_ppids == []


def test_merge_is_left_join_unmatched_rows_get_missing_value():
    desc_df = pd.DataFrame({"PPID": ["AB000010_1"], "DESC": ["First PPID"]})
    result = merge_description(_rows_df(), desc_df)

    assert result.df["DESC"].tolist() == ["First PPID", "First PPID", "-"]
    assert result.matched_count == 1
    assert result.unmatched_count == 1
    assert result.unmatched_ppids == ["AB000020_1"]


def test_merge_never_mutates_input_rows_df():
    original = _rows_df()
    snapshot = original.copy(deep=True)
    desc_df = pd.DataFrame({"PPID": ["AB000010_1"], "DESC": ["First PPID"]})

    merge_description(original, desc_df)

    pd.testing.assert_frame_equal(original, snapshot)


def test_merge_rejects_duplicate_ppid_in_description_file():
    desc_df = pd.DataFrame({"PPID": ["AB000010_1", "AB000010_1"], "DESC": ["A", "B"]})
    with pytest.raises(InvalidExcelFormatError, match="duplicate"):
        merge_description(_rows_df(), desc_df)


def test_merge_requires_ppid_column_in_rows():
    desc_df = pd.DataFrame({"PPID": ["AB000010_1"], "DESC": ["A"]})
    with pytest.raises(InvalidExcelFormatError, match="PPID"):
        merge_description(pd.DataFrame({"TS#": ["TS#1"]}), desc_df)
