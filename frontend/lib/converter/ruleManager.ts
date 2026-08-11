/**
 * TransformationRule validation + application - TS port of
 * backend/app/services/rule_manager.py (V1.10 Browser Edition).
 *
 * Reuses `TransformationRule`/`DEFAULT_RULE` from `@/lib/rules` (already
 * shared with the rule editor/preview) rather than redefining them - only
 * the *export-time* shaping (select/reorder/alias into a flat column list)
 * is new here, since the preview grid already does its own client-side
 * shaping via `resolveDisplayColumns` in lib/rules.ts.
 */

import { FULL_OUTPUT_COLUMNS } from "./constants";
import { DEFAULT_RULE, DEFAULT_COLUMN_HEADERS, type TransformationRule } from "@/lib/rules";

export type ShapedTable = {
  fields: string[];
  headers: string[];
};

const KNOWN = new Set(FULL_OUTPUT_COLUMNS);

export function validateRule(rule: TransformationRule | null | undefined): TransformationRule {
  if (!rule) return DEFAULT_RULE;

  const outputColumns = rule.output_columns.filter((c) => KNOWN.has(c));
  const effectiveOutput = outputColumns.length ? outputColumns : [...FULL_OUTPUT_COLUMNS];

  const enabled = new Set(effectiveOutput);
  const columnOrder = rule.column_order.filter((c) => enabled.has(c));
  for (const c of effectiveOutput) {
    if (!columnOrder.includes(c)) columnOrder.push(c);
  }

  const aliases: Record<string, string> = {};
  for (const [k, v] of Object.entries(rule.aliases)) {
    if (KNOWN.has(k) && v.trim()) aliases[k] = v;
  }

  return {
    id: rule.id,
    rule_name: rule.rule_name || "Untitled Rule",
    output_columns: effectiveOutput,
    column_order: columnOrder,
    aliases,
  };
}

/** Selects, reorders, and aliases `availableColumns` per `rule`. */
export function applyRule(
  availableColumns: string[],
  rule: TransformationRule | null | undefined
): ShapedTable {
  const normalized = validateRule(rule);
  const availableSet = new Set(availableColumns);
  const orderedColumns = normalized.column_order.filter((c) => availableSet.has(c));
  // V1.14: same default-header fallback as lib/rules.ts's
  // resolveDisplayColumns (kept in sync manually - this file is already a
  // deliberate, documented duplication of that preview-side shaping for
  // export-time authoritative shaping, see this file's header comment).
  const headers = orderedColumns.map((c) => normalized.aliases[c] ?? DEFAULT_COLUMN_HEADERS[c] ?? c);
  return { fields: orderedColumns, headers };
}
