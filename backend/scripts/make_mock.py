# -*- coding: utf-8 -*-
"""Generate a production-like mock excel file for manual testing and
regression tests.

Includes, on purpose:
  - Many PPIDs with a variable number of TS blocks (1..10) each, some with
    randomly missing fields (exercises the "-" fill rule).
  - Extra columns beyond PPID/Parameter/Reference Value (Operator, Comment)
    that must be ignored (Feature 2 - flexible input columns).
  - Unsupported Parameters (Comment/LotNo/Operator rows, and an out-of-range
    TS#11) that must be silently ignored (Feature 3).

Usage:
    python scripts/make_mock.py [output_path]        # .xlsx (default)
    python scripts/make_mock.py [output_path.xls]     # legacy .xls (needs xlwt - see requirements-dev.txt)
"""

import random
import sys
from pathlib import Path

import openpyxl

PPID_COUNT = 150
FIELDS = [
    "FilmMaterial",
    "CardName",
    "CorrelationCard_1",
    "CorrelationCard_2",
    "CorrelationCard_3",
    "DataCombination",
    "DataFeedFoward",
]
UNKNOWN_PARAMETERS = ["Comment", "LotNo", "Operator"]

SEED = 42


def _make_ppid(n: int) -> str:
    return f"AB{n:06d}_1"


def _generate_rows(ppid_count: int = PPID_COUNT) -> tuple[list[list], int, int]:
    """Builds the raw grid (list of rows) shared by both the .xlsx and
    legacy .xls writers, so the two formats always contain identical data."""
    rng = random.Random(SEED)
    rows: list[list] = [["PPID", "Parameter", "REF.xxx", "Operator", "Comment"]]

    total_ts = 0
    for i in range(1, ppid_count + 1):
        ppid = _make_ppid(i)
        rows.append([ppid, "PPID", ppid, "op_a", "note"])

        ts_count = rng.randint(1, 10)
        for ts_num in range(1, ts_count + 1):
            present_fields = [f for f in FIELDS if rng.random() > 0.15]
            # A TS block with every field randomly dropped never gets a data
            # row written for it, so the transformer has no evidence it was
            # ever intended to exist and correctly produces no output row
            # for it - only count it as an expected row when it actually has
            # at least one field (V1.08: fixed a rare off-by-one this caused
            # at large PPID_COUNT, where the ~1e-6 per-block chance of this
            # actually occurs a handful of times).
            if present_fields:
                total_ts += 1
            for field in present_fields:
                if field in ("DataCombination", "DataFeedFoward"):
                    value = rng.randint(0, 100)
                else:
                    value = f"{field}_val_{ppid}_{ts_num}"
                rows.append([ppid, f"TS#{ts_num}_{field}", value, "op_a", "note"])

            if rng.random() < 0.3:
                unknown = rng.choice(UNKNOWN_PARAMETERS)
                rows.append([ppid, unknown, "should_be_ignored", "op_a", "note"])

        if rng.random() < 0.1:
            # Out-of-range TS (max is TS#10) - must be ignored, not crash.
            rows.append([ppid, "TS#11_CardName", "TOO_FAR", "op_a", "note"])

    return rows, ppid_count, total_ts


def build_workbook(path: str, ppid_count: int = PPID_COUNT) -> tuple[int, int]:
    """Writes the modern .xlsx mock file."""
    rows, n_ppid, n_ts = _generate_rows(ppid_count)
    wb = openpyxl.Workbook()
    ws = wb.active
    for row in rows:
        ws.append(row)
    wb.save(path)
    return n_ppid, n_ts


def build_legacy_workbook(path: str, ppid_count: int = PPID_COUNT) -> tuple[int, int]:
    """Writes the legacy .xls mock file (same data as build_workbook).

    Requires xlwt, a dev-only dependency (see backend/requirements-dev.txt) -
    the running app only ever *reads* .xls (via xlrd), never writes it.
    """
    try:
        import xlwt
    except ImportError as exc:
        raise SystemExit(
            "Generating a .xls mock requires xlwt: pip install -r requirements-dev.txt"
        ) from exc

    rows, n_ppid, n_ts = _generate_rows(ppid_count)
    wb = xlwt.Workbook()
    ws = wb.add_sheet("Sheet1")
    for r, row in enumerate(rows):
        for c, value in enumerate(row):
            ws.write(r, c, value)
    wb.save(path)
    return n_ppid, n_ts


if __name__ == "__main__":
    out_path = sys.argv[1] if len(sys.argv) > 1 else str(Path(__file__).parent / "mock_input.xlsx")
    if out_path.lower().endswith(".xls"):
        n_ppid, n_ts = build_legacy_workbook(out_path)
    else:
        n_ppid, n_ts = build_workbook(out_path)
    print(f"Generated {out_path}: {n_ppid} PPIDs, {n_ts} TS blocks (expected output rows)")
