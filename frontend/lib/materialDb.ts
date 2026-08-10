/**
 * Material DB (V1.12 Film Material Visualization).
 *
 * The administrator-maintained source of truth is a plain CSV file at
 * frontend/public/data/material-db.csv (Material Code,Color) - no
 * hard-coded Material/color mapping in application code, per spec.
 *
 * Two distinct failure modes, kept separate so the UI can show the right
 * message for each (spec sections 12 vs 13):
 *  - "invalid": the file loaded, but its *content* is wrong (duplicate
 *    code, unrecognized color) - a "Material Database Error".
 *  - "load-error": the file itself couldn't be loaded or parsed as CSV at
 *    all (missing/network failure/malformed structure) - "Material
 *    Database Unavailable". Either way, Film Material Visualization is
 *    disabled, but the rest of the app (Excel conversion) is unaffected -
 *    nothing here is invoked from the conversion path at all.
 */

import { isValidCssColor } from "./cssColor";

export type MaterialDbOk = {
  status: "ok";
  /** Material Code -> Color (as given in the CSV, not normalized - the
   * Dialog renders it directly as a CSS background-color value). */
  entries: Map<string, string>;
  /** Every known code, longest first - the exact order the Longest Match
   * First tokenizer (filmMaterialParser.ts) needs to try candidates in. */
  codesLongestFirst: string[];
};

export type MaterialDbInvalid = { status: "invalid"; message: string };
export type MaterialDbLoadError = { status: "load-error"; message: string };
export type MaterialDbResult = MaterialDbOk | MaterialDbInvalid | MaterialDbLoadError;

const EXPECTED_HEADER = ["material code", "color"];

/** Parses and validates already-fetched CSV text. Pure - no I/O, so it's
 * directly unit-testable against every case in spec section 12 without
 * mocking fetch. */
export function parseMaterialDbCsv(csvText: string): MaterialDbResult {
  const lines = csvText.split(/\r\n|\r|\n/).filter((line) => line.trim() !== "");
  if (lines.length === 0) {
    return { status: "load-error", message: "material-db.csv is empty." };
  }

  const header = lines[0].split(",").map((cell) => cell.trim());
  if (header.length !== 2 || header.map((h) => h.toLowerCase()).join(",") !== EXPECTED_HEADER.join(",")) {
    return { status: "load-error", message: "material-db.csv has an unexpected header - expected 'Material Code,Color'." };
  }

  const entries = new Map<string, string>();
  for (const line of lines.slice(1)) {
    const parts = line.split(",");
    if (parts.length !== 2) {
      return { status: "load-error", message: `material-db.csv has an invalid row: "${line}"` };
    }
    const code = parts[0].trim();
    const color = parts[1].trim();
    if (!code) {
      return { status: "load-error", message: `material-db.csv has a row with no Material Code: "${line}"` };
    }
    if (entries.has(code)) {
      return { status: "invalid", message: `Duplicate Material Code: ${code}` };
    }
    if (!isValidCssColor(color)) {
      return { status: "invalid", message: `Invalid color for Material Code: ${code}` };
    }
    entries.set(code, color);
  }

  const codesLongestFirst = [...entries.keys()].sort((a, b) => b.length - a.length);
  return { status: "ok", entries, codesLongestFirst };
}

let cachedPromise: Promise<MaterialDbResult> | null = null;

async function fetchAndParse(): Promise<MaterialDbResult> {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  let res: Response;
  try {
    res = await fetch(`${basePath}/data/material-db.csv`);
  } catch {
    return { status: "load-error", message: "Could not reach material-db.csv." };
  }
  if (!res.ok) {
    return { status: "load-error", message: `Could not load material-db.csv (${res.status}).` };
  }
  const text = await res.text();
  return parseMaterialDbCsv(text);
}

/** Loads and validates the Material DB, fetched once and cached for the
 * lifetime of the page (V1.12: "no separate Reload button required" -
 * a fresh deploy naturally serves a fresh file on the next page load). */
export function loadMaterialDb(): Promise<MaterialDbResult> {
  if (!cachedPromise) cachedPromise = fetchAndParse();
  return cachedPromise;
}

/** Test-only: clears the module-level cache so each test starts fresh. */
export function __resetMaterialDbCacheForTests(): void {
  cachedPromise = null;
}
