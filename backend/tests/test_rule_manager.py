# -*- coding: utf-8 -*-
"""Regression tests for app.services.rule_manager (V1.03)."""

from app.models.constants import FULL_OUTPUT_COLUMNS
from app.models.schemas import TransformationRule
from app.services import rule_manager
from app.services.excel_transformer import ExcelTransformer
from app.utils.excel_io import read_raw_rows


def _transform(xlsx_bytes: bytes):
    return ExcelTransformer().transform(read_raw_rows(xlsx_bytes))


def test_default_rule_matches_unshaped_output(sample_xlsx_bytes):
    df = _transform(sample_xlsx_bytes)
    shaped = rule_manager.apply_rule(df, rule_manager.DEFAULT_RULE)
    assert list(shaped.df.columns) == FULL_OUTPUT_COLUMNS
    assert shaped.headers == FULL_OUTPUT_COLUMNS
    assert shaped.df.equals(df)


def test_none_rule_falls_back_to_default(sample_xlsx_bytes):
    df = _transform(sample_xlsx_bytes)
    shaped = rule_manager.apply_rule(df, None)
    assert shaped.df.equals(df)


def test_custom_rule_selects_orders_and_aliases(sample_xlsx_bytes):
    df = _transform(sample_xlsx_bytes)
    rule = TransformationRule(
        rule_name="Engineering",
        output_columns=["PPID", "TS#", "FilmMaterial", "CardName"],
        column_order=["PPID", "FilmMaterial", "CardName", "TS#"],
        aliases={"PPID": "Recipe Name", "CardName": "Card"},
    )
    shaped = rule_manager.apply_rule(df, rule)
    assert list(shaped.df.columns) == ["PPID", "FilmMaterial", "CardName", "TS#"]
    assert shaped.headers == ["Recipe Name", "FilmMaterial", "Card", "TS#"]


def test_unknown_columns_dropped_not_raised(sample_xlsx_bytes):
    df = _transform(sample_xlsx_bytes)
    rule = TransformationRule(output_columns=["PPID", "NotAField"], column_order=["NotAField", "PPID"])
    shaped = rule_manager.apply_rule(df, rule)
    assert list(shaped.df.columns) == ["PPID"]


def test_empty_rule_falls_back_to_full_column_set(sample_xlsx_bytes):
    df = _transform(sample_xlsx_bytes)
    rule = TransformationRule(output_columns=[], column_order=[])
    shaped = rule_manager.apply_rule(df, rule)
    assert list(shaped.df.columns) == FULL_OUTPUT_COLUMNS
