# -*- coding: utf-8 -*-
"""Small, generic DataFrame helpers shared across services (V1.08).

Extracted from description_merger.py and routes.py, which had each grown
their own copy of "find where PPID is and insert DESC right after it, or
at the end if PPID isn't there" - flagged as duplication risk in the
V1.07 code review. One implementation now backs both the Add Description
merge and the /api/export DESC placement, so "Preview = Export" only has
one place to be correct.
"""

from typing import Any, Iterable, Sequence

import pandas as pd


def find_insert_position(columns: Sequence[Any], after: Any) -> int:
    """Position to insert a new column at, immediately following `after` -
    or at the end of `columns` if `after` isn't present (no natural anchor
    to insert after, e.g. a Transformation Rule that disabled that column)."""
    columns = list(columns)
    return columns.index(after) + 1 if after in columns else len(columns)


def insert_column_after(df: pd.DataFrame, column: str, values: Iterable[Any], after: Any) -> pd.DataFrame:
    """Returns a copy of `df` with `column` (holding `values`) inserted
    immediately after the `after` column - or appended at the end if
    `after` isn't present. Never mutates `df`."""
    result = df.copy()
    result.insert(find_insert_position(result.columns, after), column, values)
    return result
