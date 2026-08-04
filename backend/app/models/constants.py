# -*- coding: utf-8 -*-
"""Output shape constants for the excel conversion.

Future versions should only require modifying OUTPUT_COLUMNS here.
"""

# Columns that must appear on every output row, in order, after PPID and TS#.
OUTPUT_COLUMNS: list[str] = [
    "CardName",
    "FilmMaterial",
    "CorrelationCard_1",
    "CorrelationCard_2",
    "CorrelationCard_3",
    "DataCombination",
    "DataFeedFoward",
]

# Full output header, including the always-present identifier columns.
FULL_OUTPUT_COLUMNS: list[str] = ["PPID", "TS#"] + OUTPUT_COLUMNS

# Value used to fill any field missing from a given TS block.
MISSING_VALUE = "-"

# TS# blocks only ever range from TS#1 to TS#10.
MAX_TS_NUMBER = 10

# Literal value in the Parameter column that marks a block separator/header row.
BLOCK_SEPARATOR_PARAMETER = "PPID"

# Prefix used to render the TS# output column (e.g. "TS#1" instead of the bare number 1).
TS_LABEL_PREFIX = "TS#"
