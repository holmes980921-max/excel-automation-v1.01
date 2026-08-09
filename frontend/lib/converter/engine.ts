/**
 * Local conversion engine (V1.10 Browser Edition) - the in-worker
 * replacement for what used to be HTTP calls to the FastAPI backend
 * (`POST /api/convert`, `/api/convert-text`, `/api/export`,
 * `/api/add-description`). Pure functions, no DOM/React dependency, so
 * they're directly unit-testable and also the exact code that runs inside
 * worker.ts.
 *
 * Response shapes intentionally mirror the old backend's Pydantic models
 * (`ConvertResponse`, `AddDescriptionResponse`) so the rest of the app
 * (page.tsx, HomeScreen, StatusBar, ExcelGrid...) needed no changes beyond
 * swapping what's imported from `@/lib/api`.
 */

import * as transformer from "./transformer";
import * as ruleManager from "./ruleManager";
import { mergeDescription, type DescriptionRow } from "./descriptionMerger";
import {
  InvalidExcelFormatError,
  parsePastedTable,
  parsePastedText,
  parseHtmlTable,
  readDescriptionFile,
  readRawRows,
  resolveDescriptionRows,
  rowsToXlsxBlob,
  toNumberIfNumeric,
} from "./excelIO";
import { FULL_OUTPUT_COLUMNS } from "./constants";
import type { TransformationRule } from "@/lib/rules";

export { InvalidExcelFormatError };

export type ConversionSummary = transformer.ConversionSummary;

export type DebugInfo = {
  stages_seconds: Record<string, number>;
  total_seconds: number;
  peak_memory_mb: number;
  engine_used: string;
};

export type ConvertResult = {
  filename: string;
  columns: string[];
  rows: Record<string, unknown>[];
  total_rows: number;
  summary: ConversionSummary;
  debug: DebugInfo | null;
};

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function buildConvertResult(
  rows: Record<string, unknown>[],
  filename: string,
  stagesSeconds: Record<string, number>,
  debug: boolean,
  engineUsed: string
): ConvertResult {
  if (rows.length === 0) {
    throw new InvalidExcelFormatError(
      "No TS# data found. Check that the input matches the expected PPID/Parameter/Value format."
    );
  }
  const totalSeconds = Object.values(stagesSeconds).reduce((a, b) => a + b, 0);
  const summary = transformer.summarize(rows, totalSeconds);

  let debugInfo: DebugInfo | null = null;
  if (debug) {
    const stages: Record<string, number> = {};
    for (const [k, v] of Object.entries(stagesSeconds)) stages[k] = round3(v);
    debugInfo = {
      stages_seconds: stages,
      total_seconds: round3(totalSeconds),
      // The browser has no cross-browser equivalent of the Python
      // version's psutil-based peak-RSS sampling (performance.memory is
      // Chrome-only/non-standard, and the standards-track replacement
      // requires cross-origin-isolation headers this static site doesn't
      // send) - reported as 0 rather than a fabricated number.
      peak_memory_mb: 0,
      engine_used: engineUsed,
    };
  }

  return {
    filename,
    columns: FULL_OUTPUT_COLUMNS,
    rows,
    total_rows: rows.length,
    summary,
    debug: debugInfo,
  };
}

export function convertFile(fileBytes: Uint8Array, originalFilename: string | null, debug = false): ConvertResult {
  const t0 = performance.now();
  const rawRows = readRawRows(fileBytes);
  const t1 = performance.now();
  const rows = transformer.transform(rawRows);
  const t2 = performance.now();

  const stem = originalFilename ? originalFilename.replace(/\.[^./\\]+$/, "") || "converted" : "converted";
  return buildConvertResult(
    rows,
    `${stem}_converted.xlsx`,
    { read_and_parse: (t1 - t0) / 1000, transform: (t2 - t1) / 1000 },
    debug,
    "xlsx"
  );
}

export function convertText(text: string, debug = false): ConvertResult {
  if (!text || !text.trim()) {
    throw new InvalidExcelFormatError("Pasted data is empty.");
  }
  const t0 = performance.now();
  const rawRows = parsePastedText(text);
  const t1 = performance.now();
  const rows = transformer.transform(rawRows);
  const t2 = performance.now();

  return buildConvertResult(
    rows,
    "pasted_converted.xlsx",
    { read_and_parse: (t1 - t0) / 1000, transform: (t2 - t1) / 1000 },
    debug,
    "paste"
  );
}

export type ExportResult = { filename: string; blob: Blob };

export function exportRows(
  filename: string,
  rows: Record<string, unknown>[],
  rule: TransformationRule | null
): ExportResult {
  if (!rows.length) {
    throw new InvalidExcelFormatError("No rows to export.");
  }
  const hasDesc = "DESC" in rows[0];
  const shaped = ruleManager.applyRule(FULL_OUTPUT_COLUMNS, rule);
  if (shaped.fields.length === 0) {
    throw new InvalidExcelFormatError("The selected rule has no output columns.");
  }

  // shaped.fields are still internal (pre-alias) names here - find PPID's
  // position before renaming so DESC can be inserted right after it,
  // matching the preview grid exactly (V1.07: "Preview = Export"). DESC
  // rides along regardless of the active rule's column set, same as the
  // Python version's export_rows.
  let finalFields = shaped.fields;
  let finalHeaders = shaped.headers;
  if (hasDesc) {
    const ppidPos = shaped.fields.indexOf("PPID");
    const insertAt = ppidPos === -1 ? shaped.fields.length : ppidPos + 1;
    finalFields = [...shaped.fields.slice(0, insertAt), "DESC", ...shaped.fields.slice(insertAt)];
    finalHeaders = [...shaped.headers.slice(0, insertAt), "DESC", ...shaped.headers.slice(insertAt)];
  }

  const dataRows = rows.map((row) => finalFields.map((f) => row[f] ?? null));
  const blob = rowsToXlsxBlob(finalHeaders, dataRows);
  const outFilename = filename.toLowerCase().endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  return { filename: outFilename, blob };
}

export type AddDescriptionResult = {
  columns: string[];
  rows: Record<string, unknown>[];
  total_rows: number;
  matched_count: number;
  unmatched_count: number;
  unmatched_ppids: string[];
};

function buildAddDescriptionResult(
  baseRows: Record<string, unknown>[],
  descRows: DescriptionRow[]
): AddDescriptionResult {
  if (!baseRows.length) {
    throw new InvalidExcelFormatError("No rows to merge.");
  }
  const result = mergeDescription(baseRows, descRows);
  return {
    columns: result.fields,
    rows: result.rows,
    total_rows: result.rows.length,
    matched_count: result.matchedCount,
    unmatched_count: result.unmatchedCount,
    unmatched_ppids: result.unmatchedPpids,
  };
}

export function addDescriptionFromFile(
  fileBytes: Uint8Array,
  baseRows: Record<string, unknown>[]
): AddDescriptionResult {
  const descRows = readDescriptionFile(fileBytes);
  return buildAddDescriptionResult(baseRows, descRows);
}

/**
 * Add Description clipboard paste (V1.10 - fixes the V1.09 gap where only
 * Drag & Drop / Upload were supported). Tries `text/html` first (Excel
 * always includes a `<table>` alongside plain text on copy, and it survives
 * a literal tab or newline character inside a DESC cell that would corrupt
 * naive TSV splitting); falls back to `text/plain` TSV when no HTML
 * clipboard payload is present (e.g. paste from a plain-text source).
 * Both paths converge on the same `resolveDescriptionRows` column
 * resolution and `mergeDescription` merge as Upload/Drag & Drop, so all
 * three input methods are guaranteed to produce identical results for the
 * same data.
 */
export function addDescriptionFromClipboard(
  clipboard: { html?: string; text?: string },
  baseRows: Record<string, unknown>[]
): AddDescriptionResult {
  let rows: unknown[][];
  if (clipboard.html && clipboard.html.trim()) {
    try {
      rows = parseHtmlTable(clipboard.html).map((row) => row.map((cell) => toNumberIfNumeric(cell)));
    } catch {
      rows = parsePastedTable(clipboard.text ?? "");
    }
  } else {
    rows = parsePastedTable(clipboard.text ?? "");
  }
  const descRows = resolveDescriptionRows(rows);
  return buildAddDescriptionResult(baseRows, descRows);
}
