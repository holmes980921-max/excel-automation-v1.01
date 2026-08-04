# -*- coding: utf-8 -*-
"""Generate a production-like mock .xlsx for manual testing and regression tests.

Includes, on purpose:
  - Many PPIDs with a variable number of TS blocks (1..10) each, some with
    randomly missing fields (exercises the "-" fill rule).
  - Extra columns beyond PPID/Parameter/Reference Value (Operator, Comment)
    that must be ignored (Feature 2 - flexible input columns).
  - Unsupported Parameters (Comment/LotNo/Operator rows, and an out-of-range
    TS#11) that must be silently ignored (Feature 3).

Usage:
    python scripts/make_mock.py [output_path]
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


def build_workbook(path: str, ppid_count: int = PPID_COUNT) -> tuple[int, int]:
    rng = random.Random(SEED)
    wb = openpyxl.Workbook()
    ws = wb.active

    # Extra columns D/E ("Operator", "Comment") must be ignored by the converter.
    ws.append(["PPID", "Parameter", "REF.xxx", "Operator", "Comment"])

    total_ts = 0
    for i in range(1, ppid_count + 1):
        ppid = _make_ppid(i)
        ws.append([ppid, "PPID", ppid, "op_a", "note"])

        ts_count = rng.randint(1, 10)
        for ts_num in range(1, ts_count + 1):
            total_ts += 1
            present_fields = [f for f in FIELDS if rng.random() > 0.15]
            for field in present_fields:
                if field in ("DataCombination", "DataFeedFoward"):
                    value = rng.randint(0, 100)
                else:
                    value = f"{field}_val_{ppid}_{ts_num}"
                ws.append([ppid, f"TS#{ts_num}_{field}", value, "op_a", "note"])

            if rng.random() < 0.3:
                unknown = rng.choice(UNKNOWN_PARAMETERS)
                ws.append([ppid, unknown, "should_be_ignored", "op_a", "note"])

        if rng.random() < 0.1:
            # Out-of-range TS (max is TS#10) - must be ignored, not crash.
            ws.append([ppid, "TS#11_CardName", "TOO_FAR", "op_a", "note"])

    wb.save(path)
    return ppid_count, total_ts


if __name__ == "__main__":
    out_path = sys.argv[1] if len(sys.argv) > 1 else str(Path(__file__).parent / "mock_input.xlsx")
    n_ppid, n_ts = build_workbook(out_path)
    print(f"Generated {out_path}: {n_ppid} PPIDs, {n_ts} TS blocks (expected output rows)")
