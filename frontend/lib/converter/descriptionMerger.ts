/**
 * DescriptionMerger - TS port of
 * backend/app/services/description_merger.py (V1.10 Browser Edition).
 *
 * Left-joins a DESC column onto already-converted rows by PPID. Kept
 * decoupled from the transformer/rule engine, same spirit as the Python
 * version: this only *adds* a column to data that already exists.
 */

import { MISSING_VALUE } from "./constants";
import { insertFieldAfter } from "./dfHelpers";

// Cap on how many duplicate/unmatched PPIDs are echoed back - production
// description data can be large, and nobody reads a list of 5,000 PPIDs.
const MAX_LISTED_PPIDS = 50;

export class InvalidExcelFormatError extends Error {}

export type DescriptionRow = { PPID: unknown; DESC: unknown };

export type MergeResult = {
  rows: Record<string, unknown>[];
  fields: string[];
  matchedCount: number;
  unmatchedCount: number;
  unmatchedPpids: string[];
};

/**
 * Left-joins `descRows` (PPID, DESC) onto `rowsData` (the already-converted
 * data) by PPID.
 *
 * - `rowsData` is never mutated - every returned row is a fresh object.
 *   Multiple rows sharing a PPID all receive the same DESC.
 * - `descRows`'s PPID must be unique; a duplicate is a validation error,
 *   not a silently-resolved conflict.
 * - Rows whose PPID has no match get MISSING_VALUE ("-").
 * - matched/unmatched counts are per distinct PPID, matching the Status
 *   Bar's "Matched PPIDs" / "Unmatched PPIDs" labels.
 */
export function mergeDescription(rowsData: Record<string, unknown>[], descRows: DescriptionRow[]): MergeResult {
  if (rowsData.length === 0 || !("PPID" in rowsData[0])) {
    throw new InvalidExcelFormatError("Converted data is missing a PPID column.");
  }

  const cleanedDesc = descRows.map((r) => ({ ppid: String(r.PPID ?? "").trim(), desc: r.DESC }));

  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const r of cleanedDesc) {
    if (seen.has(r.ppid)) duplicates.add(r.ppid);
    seen.add(r.ppid);
  }
  if (duplicates.size > 0) {
    const sorted = Array.from(duplicates).sort();
    const shown = sorted.slice(0, MAX_LISTED_PPIDS).join(", ");
    const suffix = sorted.length > MAX_LISTED_PPIDS ? ` and ${sorted.length - MAX_LISTED_PPIDS} more` : "";
    throw new InvalidExcelFormatError(`Description file has duplicate PPID(s): ${shown}${suffix}`);
  }

  const lookup = new Map(cleanedDesc.map((r) => [r.ppid, r.desc]));

  const uniquePpids: string[] = [];
  const uniqueSeen = new Set<string>();
  const mergedRows = rowsData.map((row) => {
    const ppid = String(row.PPID ?? "").trim();
    if (!uniqueSeen.has(ppid)) {
      uniqueSeen.add(ppid);
      uniquePpids.push(ppid);
    }
    const desc = lookup.has(ppid) ? lookup.get(ppid) : MISSING_VALUE;
    return { ...row, DESC: desc };
  });

  const matchedPpids = uniquePpids.filter((p) => lookup.has(p));
  const unmatchedPpids = uniquePpids.filter((p) => !lookup.has(p)).sort();

  // V1.07: DESC always displays/exports immediately after PPID - shared
  // with /api/export's placement logic (see engine.ts's exportRows, which
  // uses the same insertFieldAfter helper for the same reason).
  const fields = insertFieldAfter(Object.keys(rowsData[0]), "DESC", "PPID");

  return {
    rows: mergedRows,
    fields,
    matchedCount: matchedPpids.length,
    unmatchedCount: unmatchedPpids.length,
    unmatchedPpids: unmatchedPpids.slice(0, MAX_LISTED_PPIDS),
  };
}
