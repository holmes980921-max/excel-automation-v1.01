# -*- coding: utf-8 -*-
"""Large-dataset regression test (V1.08 "Large Dataset Tests" requirement).

Not a benchmark (see scripts/benchmark.py for that, and
PERFORMANCE_REPORT_V1.08.md for measured numbers at 300k-row scale) - this
is a correctness check at a scale large enough to catch anything that only
shows up with real data volume (e.g. an off-by-one that's invisible with a
handful of rows, or a slow path that would time out here), kept small
enough (~15-25k output rows) to run in the normal test suite every time
rather than only on demand.
"""

import sys
from io import BytesIO
from pathlib import Path

import openpyxl
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))
from make_mock import _generate_rows  # noqa: E402

from app.main import app

client = TestClient(app)

PPID_COUNT = 5000


def _build_xlsx_bytes(rows: list[list]) -> bytes:
    wb = openpyxl.Workbook()
    ws = wb.active
    for row in rows:
        ws.append(row)
    buf = BytesIO()
    wb.save(buf)
    return buf.getvalue()


def test_convert_handles_a_large_file_correctly():
    rows, n_ppid, n_ts = _generate_rows(PPID_COUNT)
    xlsx_bytes = _build_xlsx_bytes(rows)

    res = client.post(
        "/api/convert",
        files=[("file", ("large.xlsx", BytesIO(xlsx_bytes), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))],
    )

    assert res.status_code == 200
    data = res.json()
    assert data["total_rows"] == n_ts
    assert data["summary"]["ppid_count"] == n_ppid
    assert len(data["rows"]) == n_ts


def test_convert_text_handles_a_large_paste_correctly():
    rows, n_ppid, n_ts = _generate_rows(PPID_COUNT)
    # Mirrors what the frontend sends after a large paste is parsed
    # (see frontend/lib/pasteSummary.ts) - tab-separated, header included.
    text = "\n".join("\t".join(str(cell) for cell in row) for row in rows)

    res = client.post("/api/convert-text", json={"text": text})

    assert res.status_code == 200
    data = res.json()
    assert data["total_rows"] == n_ts
    assert data["summary"]["ppid_count"] == n_ppid
