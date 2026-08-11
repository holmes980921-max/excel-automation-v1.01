/**
 * ExcelTransformer - direct TS port of
 * backend/app/services/excel_transformer.py (V1.10 Browser Edition).
 *
 * Input shape (3 columns): PPID | Parameter | Reference Value
 *
 * Every PPID block starts with a separator row where Parameter == "PPID"
 * (ignored - column A already carries the PPID on every subsequent data
 * row). Parameters below the separator look like "TS#<n>_<field>"
 * (n = 1..10). One output row is produced per (PPID, TS#) pair found, with
 * every OUTPUT_COLUMNS field filled in (missing fields become "-").
 *
 * Row objects (not a DataFrame) are the natural representation here - the
 * frontend already works entirely in row-object arrays (see
 * `ConvertResponse.rows` in the old `lib/api.ts`), so there is no need for
 * a column-oriented intermediate the way the Python backend uses one.
 */

import {
  BLOCK_SEPARATOR_PARAMETER,
  MAX_TS_NUMBER,
  MISSING_VALUE,
  OUTPUT_COLUMNS,
  TS_LABEL_PREFIX,
} from "./constants";
import { LAST_SEGMENT_FIELDS, extractLastPathSegment } from "./lastPathSegment";

export type RawRow = [unknown, unknown, unknown];
export type ConvertedRow = Record<string, unknown>;

export type ConversionSummary = {
  ppid_count: number;
  ts_count: number;
  generated_rows: number;
  conversion_time_seconds: number;
};

const TS_PATTERN = /^TS#(\d+)_(.+)$/;

function clean(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = String(value).trim();
  return text.toLowerCase() === "nan" ? "" : text;
}

export function transform(rows: RawRow[]): ConvertedRow[] {
  // PPID -> TS# -> { field_name: value }, matching the Python nested-dict
  // grouping exactly (including that a PPID with no valid TS# rows never
  // produces output, whether or not it had a separator row - a Map entry
  // is only ever created once a real TS# match is found).
  const grouped = new Map<string, Map<number, Record<string, unknown>>>();

  for (const [ppidRaw, parameterRaw, value] of rows) {
    const ppid = clean(ppidRaw);
    const parameter = clean(parameterRaw);
    if (!ppid || !parameter) continue;

    if (parameter === BLOCK_SEPARATOR_PARAMETER) continue;

    const match = TS_PATTERN.exec(parameter);
    if (!match) continue;

    const tsNum = parseInt(match[1], 10);
    if (tsNum < 1 || tsNum > MAX_TS_NUMBER) continue;

    const field = match[2].trim();

    let block = grouped.get(ppid);
    if (!block) {
      block = new Map();
      grouped.set(ppid, block);
    }
    let fields = block.get(tsNum);
    if (!fields) {
      fields = {};
      block.set(tsNum, fields);
    }
    fields[field] = value;
  }

  const result: ConvertedRow[] = [];
  for (const [ppid, tsMap] of grouped) {
    const tsNums = Array.from(tsMap.keys()).sort((a, b) => a - b);
    for (const tsNum of tsNums) {
      const fields = tsMap.get(tsNum)!;
      const row: ConvertedRow = { PPID: ppid, "TS#": `${TS_LABEL_PREFIX}${tsNum}` };
      for (const col of OUTPUT_COLUMNS) {
        // `col in fields` (not a truthiness/undefined check) mirrors
        // Python's dict.get(col, MISSING_VALUE): a field that was present
        // in the source but genuinely blank stays blank/null, while a
        // field never mentioned at all becomes "-".
        let value = col in fields ? fields[col] : MISSING_VALUE;
        // V1.14: the only new transformation logic - PreProcess/
        // ReferenceTestPathName get the last-backslash-segment extraction
        // applied once the TS# match above has already found their value.
        // MISSING_VALUE ("-") has no backslash, so this is a no-op for a
        // genuinely missing field.
        if (LAST_SEGMENT_FIELDS.has(col)) value = extractLastPathSegment(value);
        row[col] = value;
      }
      result.push(row);
    }
  }
  return result;
}

export function summarize(rows: ConvertedRow[], conversionTimeSeconds: number): ConversionSummary {
  const ppidCount = rows.length ? new Set(rows.map((r) => r.PPID)).size : 0;
  const generatedRows = rows.length;
  return {
    ppid_count: ppidCount,
    ts_count: generatedRows,
    generated_rows: generatedRows,
    conversion_time_seconds: Math.round(conversionTimeSeconds * 100) / 100,
  };
}
