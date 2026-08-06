# -*- coding: utf-8 -*-
"""Shared fixtures for building small in-memory sample excel files."""

from io import BytesIO

import openpyxl
import pytest


def _build_xlsx(rows: list[list]) -> bytes:
    wb = openpyxl.Workbook()
    ws = wb.active
    for row in rows:
        ws.append(row)
    buf = BytesIO()
    wb.save(buf)
    return buf.getvalue()


SAMPLE_ROWS = [
    ["PPID", "Parameter", "REF.xxx"],
    ["AB000010_1", "PPID", "AB000010_1"],
    ["AB000010_1", "TS#1_FilmMaterial", "GASLKEJQLWKEJ"],
    ["AB000010_1", "TS#1_CardName", "CARD1"],
    ["AB000010_1", "TS#2_FilmMaterial", "FILM2"],
    ["AB000020_1", "PPID", "AB000020_1"],
    ["AB000020_1", "TS#1_CardName", "CARDX"],
]


@pytest.fixture
def sample_xlsx_bytes() -> bytes:
    return _build_xlsx(SAMPLE_ROWS)


@pytest.fixture
def sample_html_masquerading_as_xls_bytes() -> bytes:
    """Mimics an ERP/MES 'export to Excel' tool that writes an HTML <table>
    and gives it a .xls extension - Excel opens these transparently."""
    rows_html = "".join(
        "<tr>" + "".join(f"<td>{cell}</td>" for cell in row) + "</tr>" for row in SAMPLE_ROWS
    )
    html = f"""<html xmlns:o="urn:schemas-microsoft-com:office:office">
<head><meta charset="utf-8"></head>
<body><table border=1>{rows_html}</table></body></html>"""
    return html.encode("utf-8")
