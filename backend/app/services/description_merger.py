# -*- coding: utf-8 -*-
"""DescriptionMerger - left-joins a DESC column onto already-converted rows
by PPID (V1.06 "Add Description" feature).

Intentionally decoupled from ExcelTransformer, same spirit as rule_manager:
this only *adds* a column to data that already exists, it never re-derives
or mutates the converted rows themselves.
"""

from dataclasses import dataclass

import pandas as pd

from app.models.constants import MISSING_VALUE
from app.utils.df_helpers import insert_column_after
from app.utils.excel_io import InvalidExcelFormatError

# Cap on how many duplicate/unmatched PPIDs are echoed back in an error
# message or response - production description files can be large, and
# nobody reads a list of 5,000 PPIDs anyway.
_MAX_LISTED_PPIDS = 50


@dataclass(frozen=True)
class MergeResult:
    df: pd.DataFrame
    matched_count: int
    unmatched_count: int
    unmatched_ppids: list[str]


def merge_description(rows_df: pd.DataFrame, desc_df: pd.DataFrame) -> MergeResult:
    """Left-join `desc_df` (PPID, DESC) onto `rows_df` by PPID.

    - `rows_df` (the already-converted data) is never mutated - a fresh
      copy is returned. Multiple rows sharing a PPID all receive the same
      DESC (Requirement: "DESC shall be added to every matching row").
    - `desc_df`'s PPID must be unique; a duplicate is a validation error,
      not a silently-resolved conflict, since there'd be no principled way
      to pick which DESC wins.
    - Rows whose PPID has no match get `MISSING_VALUE` ("-"), consistent
      with how the rest of the app marks an absent field.
    - matched/unmatched counts are per distinct PPID (not per row), to
      match the Status Bar's "Matched PPIDs" / "Unmatched PPIDs" labels.
    """
    if "PPID" not in rows_df.columns:
        raise InvalidExcelFormatError("Converted data is missing a PPID column.")

    desc_lookup = desc_df.copy()
    desc_lookup["PPID"] = desc_lookup["PPID"].astype(str).str.strip()

    duplicate_mask = desc_lookup["PPID"].duplicated()
    if duplicate_mask.any():
        duplicates = sorted(desc_lookup.loc[duplicate_mask, "PPID"].unique().tolist())
        shown = ", ".join(duplicates[:_MAX_LISTED_PPIDS])
        suffix = f" and {len(duplicates) - _MAX_LISTED_PPIDS} more" if len(duplicates) > _MAX_LISTED_PPIDS else ""
        raise InvalidExcelFormatError(f"Description file has duplicate PPID(s): {shown}{suffix}")

    lookup = dict(zip(desc_lookup["PPID"], desc_lookup["DESC"]))

    ppid_series = rows_df["PPID"].astype(str).str.strip()
    desc_values = ppid_series.map(lookup)
    desc_values = desc_values.where(desc_values.notna(), MISSING_VALUE)

    unique_ppids = ppid_series.unique().tolist()
    matched_ppids = [p for p in unique_ppids if p in lookup]
    unmatched_ppids = sorted(p for p in unique_ppids if p not in lookup)

    # V1.07: DESC always displays/exports immediately after PPID, not at the
    # end - so every consumer (the /api/add-description response, and
    # /api/export once it reads this same column order) gets it right
    # without having to know the rule itself. Shared with /api/export's
    # placement logic via insert_column_after (see app/utils/df_helpers.py).
    merged = insert_column_after(rows_df, "DESC", desc_values.to_numpy(), after="PPID")

    return MergeResult(
        df=merged,
        matched_count=len(matched_ppids),
        unmatched_count=len(unmatched_ppids),
        unmatched_ppids=unmatched_ppids[:_MAX_LISTED_PPIDS],
    )
