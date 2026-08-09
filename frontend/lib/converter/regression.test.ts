/**
 * V1.09 (Python) vs V1.10 (JS) behavioral-parity regression suite.
 *
 * Loads the same real fixture files backend/tests/ has used since V1.04.1
 * (mock_input.xlsx, mock_input.xls, and mock_input_real_excel.xls - the
 * latter is a genuine Excel-COM-saved .xls, not a synthetic one) and
 * compares the JS engine's `transform()` output against a JSON snapshot
 * produced by the actual Python `ExcelTransformer`
 * (backend/scripts/dump_transform_json.py - see that file for how the
 * snapshots in __fixtures__/*.expected.json were generated).
 *
 * This is the concrete implementation of the spec's "goal is behavioral
 * compatibility, not necessarily identical implementation" requirement -
 * row count, column count, column names/order, and every field value are
 * compared row-for-row, not just spot-checked.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { readRawRows } from "./excelIO";
import { transform } from "./transformer";
import { FULL_OUTPUT_COLUMNS } from "./constants";

const FIXTURES_DIR = join(__dirname, "__fixtures__");

function loadExpected(name: string): Record<string, unknown>[] {
  return JSON.parse(readFileSync(join(FIXTURES_DIR, name), "utf-8"));
}

function convertFixture(name: string): Record<string, unknown>[] {
  const bytes = new Uint8Array(readFileSync(join(FIXTURES_DIR, name)));
  const rows = transform(readRawRows(bytes));
  return [...rows].sort((a, b) => {
    const ppidCmp = String(a.PPID).localeCompare(String(b.PPID));
    return ppidCmp !== 0 ? ppidCmp : String(a["TS#"]).localeCompare(String(b["TS#"]));
  });
}

describe.each([
  ["mock_input.xlsx", "mock_input_xlsx.expected.json"],
  ["mock_input.xls", "mock_input_xls.expected.json"],
  ["mock_input_real_excel.xls", "mock_input_real_excel_xls.expected.json"],
])("JS engine vs Python V1.09 engine: %s", (inputFile, expectedFile) => {
  it("produces the same row count, column set, and every field value", () => {
    const expected = loadExpected(expectedFile);
    const actual = convertFixture(inputFile);

    expect(actual).toHaveLength(expected.length);
    expect(Object.keys(actual[0])).toEqual(FULL_OUTPUT_COLUMNS);

    for (let i = 0; i < expected.length; i++) {
      for (const col of FULL_OUTPUT_COLUMNS) {
        // Python's pandas.to_json() renders every value as a string in
        // this app's data (openpyxl/xlrd read all cells as text or
        // already-string-typed here) - String() on the JS side normalizes
        // any residual number/string type difference before comparing.
        expect(String(actual[i][col] ?? ""), `row ${i}, column ${col}`).toBe(String(expected[i][col] ?? ""));
      }
    }
  });

  it("agrees on the exact set of PPIDs produced", () => {
    const expected = loadExpected(expectedFile);
    const actual = convertFixture(inputFile);
    expect(new Set(actual.map((r) => r.PPID))).toEqual(new Set(expected.map((r) => r.PPID)));
  });
});
