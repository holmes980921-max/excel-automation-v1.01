# -*- coding: utf-8 -*-
"""Unit tests for the shared column-placement helpers (V1.08) - backs both
description_merger.py's merge and routes.py's /api/export DESC placement.
"""

import pandas as pd

from app.utils.df_helpers import find_insert_position, insert_column_after


def test_find_insert_position_immediately_after_anchor():
    assert find_insert_position(["PPID", "TS#", "CardName"], "PPID") == 1


def test_find_insert_position_falls_back_to_end_when_anchor_absent():
    assert find_insert_position(["TS#", "CardName"], "PPID") == 2


def test_insert_column_after_places_column_right_after_anchor():
    df = pd.DataFrame({"PPID": ["X1"], "TS#": ["TS#1"], "CardName": ["C"]})
    result = insert_column_after(df, "DESC", ["a description"], after="PPID")

    assert list(result.columns) == ["PPID", "DESC", "TS#", "CardName"]
    assert result["DESC"].tolist() == ["a description"]


def test_insert_column_after_appends_at_end_when_anchor_absent():
    df = pd.DataFrame({"TS#": ["TS#1"], "CardName": ["C"]})
    result = insert_column_after(df, "DESC", ["a description"], after="PPID")

    assert list(result.columns) == ["TS#", "CardName", "DESC"]


def test_insert_column_after_never_mutates_the_input():
    df = pd.DataFrame({"PPID": ["X1"], "TS#": ["TS#1"]})
    snapshot = df.copy(deep=True)

    insert_column_after(df, "DESC", ["a description"], after="PPID")

    pd.testing.assert_frame_equal(df, snapshot)
