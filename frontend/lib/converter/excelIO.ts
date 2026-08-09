/**
 * Excel I/O - TS port of backend/app/utils/excel_io.py (V1.10 Browser
 * Edition). Runs entirely in-memory in the browser (inside a Web Worker -
 * see worker.ts); nothing is ever written to disk, same posture as the
 * Python version.
 *
 * Uses SheetJS (`xlsx`) for real .xls/.xlsx/.xlsm binary parsing and
 * writing - it reads legacy .xls (BIFF8/OLE2) natively in pure JS, which
 * is why it was chosen over alternatives that only support .xlsx.
 *
 * The HTML-masquerading-as-.xls case (V1.04.1: some ERP/MES "export to
 * Excel" tools write an HTML <table> with a .xls extension) is not
 * something SheetJS parses - re-implemented here via the browser's native
 * DOMParser, mirroring the Python version's pandas.read_html-based path.
 */

import * as XLSX from "xlsx";

export class InvalidExcelFormatError extends Error {
  constructor(message: string) {
    super(message);
    // Explicit, not just the inherited "Error" - lets worker.ts (V1.11)
    // reliably tell a validation failure apart from an unexpected one
    // across the postMessage boundary (where class identity is lost but a
    // plain string property survives), without relying on `instanceof`
    // across that boundary or on minifier-fragile class-name introspection.
    this.name = "InvalidExcelFormatError";
  }
}

const ZIP_SIGNATURE = [0x50, 0x4b, 0x03, 0x04]; // .xlsx/.xlsm (OOXML is a zip archive)
const OLE2_SIGNATURE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]; // legacy .xls

// How many leading bytes to sniff for an HTML signature - mirrors
// _HTML_SNIFF_WINDOW in the Python version.
const HTML_SNIFF_WINDOW = 2048;

function bytesStartWith(bytes: Uint8Array, sig: number[]): boolean {
  if (bytes.length < sig.length) return false;
  for (let i = 0; i < sig.length; i++) {
    if (bytes[i] !== sig[i]) return false;
  }
  return true;
}

export function looksLikeHtml(bytes: Uint8Array): boolean {
  let head = bytes.subarray(0, HTML_SNIFF_WINDOW);
  if (head.length >= 3 && head[0] === 0xef && head[1] === 0xbb && head[2] === 0xbf) {
    head = head.subarray(3); // strip a UTF-8 BOM, same as the Python version's lstrip
  }
  const text = new TextDecoder("utf-8", { fatal: false }).decode(head).replace(/^\s+/, "");
  const lower = text.toLowerCase();
  return lower.startsWith("<html") || lower.startsWith("<!doctype html") || lower.includes("<table");
}

export function detectExcelFormat(bytes: Uint8Array): "xlsx" | "xls" {
  if (bytesStartWith(bytes, ZIP_SIGNATURE)) return "xlsx";
  if (bytesStartWith(bytes, OLE2_SIGNATURE)) return "xls";
  throw new InvalidExcelFormatError(
    "Unrecognized file format - only legacy .xls and modern .xlsx/.xlsm excel files are supported."
  );
}

/** Pasted values arrive as plain strings; convert numeric-looking ones to
 * number so pasted/HTML-table input behaves like a real file read, mirroring
 * `_to_number` in the Python version (int-then-float-then-leave-as-string). */
export function toNumberIfNumeric(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const text = value.trim();
  if (text === "") return null;
  if (/^[+-]?\d+$/.test(text)) return parseInt(text, 10);
  if (/^[+-]?(\d+\.\d*|\.\d+|\d+)([eE][+-]?\d+)?$/.test(text)) {
    const f = parseFloat(text);
    if (!Number.isNaN(f)) return f;
  }
  return value;
}

function readWorkbookRows(bytes: Uint8Array): unknown[][] {
  const wb = XLSX.read(bytes, { type: "array" });
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  return XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null, raw: true });
}

/** Parses the first <table> out of an HTML document, returning raw string
 * cells per row (header row included) - used both for HTML-as-.xls uploads
 * and for Add Description's clipboard `text/html` paste (V1.10). */
export function parseHtmlTable(html: string): string[][] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const table = doc.querySelector("table");
  if (!table) {
    throw new InvalidExcelFormatError("No table found in the uploaded file.");
  }
  const rows: string[][] = [];
  for (const tr of Array.from(table.querySelectorAll("tr"))) {
    const cells = Array.from(tr.querySelectorAll("td, th")).map((cell) => (cell.textContent ?? "").trim());
    if (cells.length > 0) rows.push(cells);
  }
  return rows;
}

function byLowerHeaderName(header: unknown[]): Map<string, number> {
  const map = new Map<string, number>();
  // Last-occurrence-wins on a duplicate header name, matching Python's
  // `{str(col).strip().lower(): col for col in columns}` dict comprehension.
  header.forEach((col, idx) => {
    map.set(String(col ?? "").trim().toLowerCase(), idx);
  });
  return map;
}

type ResolvedInputColumns = { ppidIdx: number; parameterIdx: number; valueIdx: number; dataRows: unknown[][] };

/** Locates the PPID / Parameter / Reference Value columns by header name,
 * falling back to positional (first 3 columns) - mirrors
 * `_resolve_input_columns` in the Python version. */
function resolveInputColumns(rows: unknown[][]): ResolvedInputColumns {
  const header = rows[0] ?? [];
  const byLowerName = byLowerHeaderName(header);

  const ppidIdx = byLowerName.get("ppid");
  const parameterIdx = byLowerName.get("parameter");

  if (ppidIdx !== undefined && parameterIdx !== undefined) {
    const remaining = header.map((_, idx) => idx).filter((idx) => idx !== ppidIdx && idx !== parameterIdx);
    const valueIdx =
      remaining.find((idx) => {
        const name = String(header[idx] ?? "").trim().toLowerCase();
        return name.includes("ref") || name.includes("value");
      }) ?? remaining[0];
    if (valueIdx !== undefined) {
      return { ppidIdx, parameterIdx, valueIdx, dataRows: rows.slice(1) };
    }
  }

  if (header.length < 3) {
    throw new InvalidExcelFormatError(
      `Expected at least 3 columns (PPID, Parameter, Reference Value), got ${header.length}`
    );
  }
  return { ppidIdx: 0, parameterIdx: 1, valueIdx: 2, dataRows: rows.slice(1) };
}

type ResolvedDescriptionColumns = { ppidIdx: number; descIdx: number; dataRows: unknown[][] };

/** Locates the PPID / DESC columns in a description lookup file, by header
 * name only (case-insensitive, "Description" also accepted) - mirrors
 * `_resolve_description_columns`. */
function resolveDescriptionColumns(rows: unknown[][]): ResolvedDescriptionColumns {
  const header = rows[0] ?? [];
  const byLowerName = byLowerHeaderName(header);
  const ppidIdx = byLowerName.get("ppid");
  const descIdx = byLowerName.get("desc") ?? byLowerName.get("description");

  const missing: string[] = [];
  if (ppidIdx === undefined) missing.push("PPID");
  if (descIdx === undefined) missing.push("DESC");
  if (missing.length) {
    throw new InvalidExcelFormatError(`Description file is missing required column(s): ${missing.join(", ")}`);
  }
  return { ppidIdx: ppidIdx as number, descIdx: descIdx as number, dataRows: rows.slice(1) };
}

function readTableRows(fileBytes: Uint8Array): unknown[][] {
  if (looksLikeHtml(fileBytes)) {
    const html = new TextDecoder("utf-8", { fatal: false }).decode(fileBytes);
    return parseHtmlTable(html).map((row) => row.map((cell) => toNumberIfNumeric(cell)));
  }
  detectExcelFormat(fileBytes); // validates the signature; throws a clean error if neither matches
  return readWorkbookRows(fileBytes);
}

/** Reads the first worksheet of an uploaded excel file (.xls, .xlsx/.xlsm,
 * or an HTML table saved with a .xls extension - all auto-detected) and
 * returns the (PPID, Parameter, Reference Value) columns as raw tuples. */
export function readRawRows(fileBytes: Uint8Array): [unknown, unknown, unknown][] {
  const rows = readTableRows(fileBytes);
  const { ppidIdx, parameterIdx, valueIdx, dataRows } = resolveInputColumns(rows);
  return dataRows.map((row) => [row[ppidIdx], row[parameterIdx], row[valueIdx]]);
}

/** Reads a Description lookup file (PPID -> DESC), same format
 * auto-detection as `readRawRows`. Returns objects with literal `PPID`/
 * `DESC` keys regardless of the source file's original header casing. */
export function readDescriptionFile(fileBytes: Uint8Array): { PPID: unknown; DESC: unknown }[] {
  const rows = readTableRows(fileBytes);
  const { ppidIdx, descIdx, dataRows } = resolveDescriptionColumns(rows);
  return dataRows.map((row) => ({ PPID: row[ppidIdx], DESC: row[descIdx] }));
}

/** Same column resolution as `readDescriptionFile`, but for an
 * already-parsed array-of-arrays (used by Add Description's clipboard
 * paste path - both TSV and HTML table paste share this). */
export function resolveDescriptionRows(rows: unknown[][]): { PPID: unknown; DESC: unknown }[] {
  const { ppidIdx, descIdx, dataRows } = resolveDescriptionColumns(rows);
  return dataRows.map((row) => ({ PPID: row[ppidIdx], DESC: row[descIdx] }));
}

/** Parses text copied out of Excel (Ctrl+C -> Ctrl+V) into raw (PPID,
 * Parameter, Reference Value) rows - mirrors `parse_pasted_text`. Excel
 * separates columns with tabs; the first line is a header and is skipped. */
export function parsePastedText(text: string): [unknown, unknown, unknown][] {
  if (!text) {
    throw new InvalidExcelFormatError("Pasted data is empty.");
  }
  const lines = text.split(/\r\n|\r|\n/);
  const rows: [unknown, unknown, unknown][] = [];
  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;
    const parts = line.split("\t");
    const ppid = parts.length > 0 ? parts[0] : null;
    const parameter = parts.length > 1 ? parts[1] : null;
    const value = parts.length > 2 ? toNumberIfNumeric(parts[2]) : null;
    rows.push([ppid, parameter, value]);
  }
  return rows;
}

/** Parses a Description-lookup clipboard paste (tab-separated, header row
 * included) into raw array-of-arrays for `resolveDescriptionRows`. */
export function parsePastedTable(text: string): unknown[][] {
  if (!text || !text.trim()) {
    throw new InvalidExcelFormatError("Pasted data is empty.");
  }
  return text
    .split(/\r\n|\r|\n/)
    .filter((line) => line.trim() !== "")
    .map((line) => line.split("\t"));
}

/** Serializes a header + row array to .xlsx bytes, entirely in memory -
 * mirrors `dataframe_to_xlsx_bytes`. */
export function rowsToXlsxBlob(headerRow: string[], dataRows: unknown[][], sheetName = "Converted"): Blob {
  const aoa: unknown[][] = [headerRow, ...dataRows];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  // SheetJS's `type: "array"` returns a plain `number[]`, not a typed
  // array/ArrayBuffer - not a valid Blob part on its own, so it's wrapped
  // in a Uint8Array first.
  const wbout = new Uint8Array(XLSX.write(wb, { bookType: "xlsx", type: "array" }));
  return new Blob([wbout], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
