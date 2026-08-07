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

    merged = rows_df.copy()
    ppid_series = merged["PPID"].astype(str).str.strip()
    merged["DESC"] = ppid_series.map(lookup)

    unique_ppids = ppid_series.unique().tolist()
    matched_ppids = [p for p in unique_ppids if p in lookup]
    unmatched_ppids = sorted(p for p in unique_ppids if p not in lookup)

    merged["DESC"] = merged["DESC"].where(merged["DESC"].notna(), MISSING_VALUE)

    # V1.07: DESC always displays/exports immediately after PPID, not at the
    # end - reorder here so every consumer (the /api/add-description
    # response, and /api/export once it reads this same column order) gets
    # it right without having to know the rule itself. PPID is guaranteed
    # present in `cols` here (checked at the top of this function).
    cols = [c for c in merged.columns if c != "DESC"]
    cols.insert(cols.index("PPID") + 1, "DESC")
    merged = merged[cols]

    return MergeResult(
        df=merged,
        matched_count=len(matched_ppids),
        unmatched_count=len(unmatched_ppids),
        unmatched_ppids=unmatched_ppids[:_MAX_LISTED_PPIDS],
    )
