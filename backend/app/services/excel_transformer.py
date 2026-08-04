# -*- coding: utf-8 -*-
"""ExcelTransformer - the conversion logic, independent of the web layer.

Input shape (3 columns): PPID | Parameter | Reference Value

Every PPID block starts with a separator row where Parameter == "PPID"
(that row's PPID/value are ignored - column A already carries the PPID on
every subsequent data row, so no positional block-tracking is needed).

Parameters below the separator look like "TS#<n>_<field>" (n = 1..10).
One output row is produced per (PPID, TS#) pair found, with every
OUTPUT_COLUMNS field filled in (missing fields become "-").
"""

import re
from dataclasses import dataclass
from typing import Any

import pandas as pd

from app.models.constants import (
    BLOCK_SEPARATOR_PARAMETER,
    FULL_OUTPUT_COLUMNS,
    MAX_TS_NUMBER,
    MISSING_VALUE,
    OUTPUT_COLUMNS,
    TS_LABEL_PREFIX,
)

# "TS#<n>_<field>" -> group(1) = n, group(2) = field name
TS_PATTERN = re.compile(r"^TS#(\d+)_(.+)$")


@dataclass(frozen=True)
class ConversionSummary:
    ppid_count: int
    ts_count: int
    generated_rows: int
    conversion_time_seconds: float


class ExcelTransformer:
    """Converts raw (PPID, Parameter, Value) rows into the flat TS-per-row output."""

    def transform(self, rows: list[tuple[Any, Any, Any]]) -> pd.DataFrame:
        grouped = self._group_by_ppid_and_ts(rows)
        return self._to_dataframe(grouped)

    def summarize(self, df: pd.DataFrame, conversion_time_seconds: float) -> ConversionSummary:
        """Build the post-conversion summary shown in the UI.

        TS Count and Generated Rows are the same number by construction
        (exactly one output row per TS block) - both are reported since the
        UI shows them as distinct, separately-labeled figures.
        """
        ppid_count = int(df["PPID"].nunique()) if not df.empty else 0
        generated_rows = len(df)
        return ConversionSummary(
            ppid_count=ppid_count,
            ts_count=generated_rows,
            generated_rows=generated_rows,
            conversion_time_seconds=round(conversion_time_seconds, 2),
        )

    # -- internal -----------------------------------------------------

    def _group_by_ppid_and_ts(
        self, rows: list[tuple[Any, Any, Any]]
    ) -> dict[str, dict[int, dict[str, Any]]]:
        """PPID -> TS# -> {field_name: value}"""
        grouped: dict[str, dict[int, dict[str, Any]]] = {}

        for ppid_raw, parameter_raw, value in rows:
            ppid = self._clean(ppid_raw)
            parameter = self._clean(parameter_raw)
            if not ppid or not parameter:
                continue

            # Ensure the PPID group exists even if it has no TS rows yet.
            block = grouped.setdefault(ppid, {})

            if parameter == BLOCK_SEPARATOR_PARAMETER:
                # Separator/header row - marks a new block, carries no field data.
                continue

            match = TS_PATTERN.match(parameter)
            if not match:
                # Not a TS# field - not part of the defined output shape, ignore.
                continue

            ts_num = int(match.group(1))
            if not (1 <= ts_num <= MAX_TS_NUMBER):
                continue

            field = match.group(2).strip()
            block.setdefault(ts_num, {})[field] = value

        return grouped

    def _to_dataframe(self, grouped: dict[str, dict[int, dict[str, Any]]]) -> pd.DataFrame:
        output_rows: list[dict[str, Any]] = []

        for ppid, ts_map in grouped.items():
            for ts_num in sorted(ts_map):
                fields = ts_map[ts_num]
                row: dict[str, Any] = {"PPID": ppid, "TS#": f"{TS_LABEL_PREFIX}{ts_num}"}
                for col in OUTPUT_COLUMNS:
                    row[col] = fields.get(col, MISSING_VALUE)
                output_rows.append(row)

        return pd.DataFrame(output_rows, columns=FULL_OUTPUT_COLUMNS)

    @staticmethod
    def _clean(value: Any) -> str:
        if value is None:
            return ""
        text = str(value).strip()
        return "" if text.lower() == "nan" else text
