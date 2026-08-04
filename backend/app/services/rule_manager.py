# -*- coding: utf-8 -*-
"""RuleManager - validates a TransformationRule and applies it to already-
converted data (column select / reorder / rename).

This is intentionally decoupled from ExcelTransformer: the transformation
engine (PPID/TS# parsing) never changes, and always produces the full
V1.02 column set. A Rule only reshapes that output for presentation/export -
it can never invent data that wasn't already there.
"""

from dataclasses import dataclass

import pandas as pd

from app.models.constants import FULL_OUTPUT_COLUMNS
from app.models.schemas import TransformationRule

# The rule automatically present on first use (Feature 7). Selecting it must
# reproduce the exact V1.02 output: every column, original order, no aliases.
DEFAULT_RULE = TransformationRule(
    rule_name="Default",
    output_columns=list(FULL_OUTPUT_COLUMNS),
    column_order=list(FULL_OUTPUT_COLUMNS),
    aliases={},
)


@dataclass(frozen=True)
class ShapedTable:
    """A DataFrame plus the header labels to actually display/export."""

    df: pd.DataFrame
    headers: list[str]


def validate_rule(rule: TransformationRule | None) -> TransformationRule:
    """Normalize a rule against the known column set.

    Unknown column names (typos, a rule authored against a future/older
    column set, hand-edited JSON) are silently dropped rather than raising -
    the same "never throw on unexpected input" posture as the transformer.
    Falls back to DEFAULT_RULE when no rule is given or nothing survives
    validation.
    """
    if rule is None:
        return DEFAULT_RULE

    known = set(FULL_OUTPUT_COLUMNS)
    output_columns = [c for c in rule.output_columns if c in known] or list(FULL_OUTPUT_COLUMNS)

    enabled = set(output_columns)
    column_order = [c for c in rule.column_order if c in enabled]
    # Anything enabled but missing from column_order (stale/hand-edited rule) is appended.
    column_order += [c for c in output_columns if c not in column_order]

    aliases = {k: v for k, v in rule.aliases.items() if k in known and v.strip()}

    return TransformationRule(
        rule_name=rule.rule_name or "Untitled Rule",
        output_columns=output_columns,
        column_order=column_order,
        aliases=aliases,
    )


def apply_rule(df: pd.DataFrame, rule: TransformationRule | None) -> ShapedTable:
    """Select, reorder, and (for display purposes) rename columns per rule."""
    normalized = validate_rule(rule)
    ordered_columns = [c for c in normalized.column_order if c in df.columns]

    shaped_df = df[ordered_columns] if ordered_columns else df.iloc[:, 0:0]
    headers = [normalized.aliases.get(c, c) for c in ordered_columns]

    return ShapedTable(df=shaped_df, headers=headers)
