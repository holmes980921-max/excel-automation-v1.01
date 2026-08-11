import { describe, it, expect } from "vitest";
import { transform, summarize } from "./transformer";
import type { RawRow } from "./transformer";

// Mirrors backend/tests/conftest.py's SAMPLE_ROWS + test_excel_transformer.py,
// transcribed as raw (PPID, Parameter, Value) tuples (the same shape
// `readRawRows` produces) so the transform behavior is verified identically
// to the V1.09 Python suite.
const SAMPLE_ROWS: RawRow[] = [
  ["AB000010_1", "PPID", "AB000010_1"],
  ["AB000010_1", "TS#1_FilmMaterial", "GASLKEJQLWKEJ"],
  ["AB000010_1", "TS#1_CardName", "CARD1"],
  ["AB000010_1", "TS#2_FilmMaterial", "FILM2"],
  ["AB000020_1", "PPID", "AB000020_1"],
  ["AB000020_1", "TS#1_CardName", "CARDX"],
];

describe("transform", () => {
  it("renders TS# labels as TS#<n>", () => {
    const rows = transform(SAMPLE_ROWS);
    expect(new Set(rows.map((r) => r["TS#"]))).toEqual(new Set(["TS#1", "TS#2"]));
  });

  it("fills missing fields with the dash placeholder", () => {
    const rows = transform(SAMPLE_ROWS);
    const row = rows.find((r) => r.PPID === "AB000010_1" && r["TS#"] === "TS#2")!;
    expect(row.CardName).toBe("-");
    expect(row.FilmMaterial).toBe("FILM2");
  });

  it("preserves every PPID with no duplicate PPID/TS# pairs", () => {
    const rows = transform(SAMPLE_ROWS);
    expect(new Set(rows.map((r) => r.PPID))).toEqual(new Set(["AB000010_1", "AB000020_1"]));
    const seen = new Set(rows.map((r) => `${r.PPID}|${r["TS#"]}`));
    expect(seen.size).toBe(rows.length);
  });

  it("ignores unsupported parameters and out-of-range TS numbers", () => {
    const rows = transform([
      ["Y1", "PPID", "Y1"],
      ["Y1", "Comment", "should be ignored"],
      ["Y1", "TS#11_CardName", "too far, must be ignored"],
      ["Y1", "TS#1_CardName", "CARD_Y"],
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].CardName).toBe("CARD_Y");
    expect(rows[0]["TS#"]).toBe("TS#1");
  });

  it("skips a row with a blank PPID or Parameter", () => {
    const rows = transform([
      [null, "TS#1_CardName", "X"],
      ["Y1", null, "X"],
      ["Y1", "TS#1_CardName", "CARD_Y"],
    ]);
    expect(rows).toHaveLength(1);
  });
});

describe("transform - PreProcess/ReferenceTestPathName (V1.14)", () => {
  it("maps TS#N_PreProcess with no backslash unchanged (Test 1/4)", () => {
    const rows = transform([
      ["P1", "PPID", "P1"],
      ["P1", "TS#3_PreProcess", "PRE_PROCESS_01"],
    ]);
    const row = rows.find((r) => r["TS#"] === "TS#3")!;
    expect(row.PreProcess).toBe("PRE_PROCESS_01");
  });

  it("extracts only the text after the last backslash for PreProcess (Test 2)", () => {
    const rows = transform([
      ["P1", "PPID", "P1"],
      ["P1", "TS#3_PreProcess", "%%%%\\%%\\%%%%\\QWEDWQASJ_2"],
    ]);
    const row = rows.find((r) => r["TS#"] === "TS#3")!;
    expect(row.PreProcess).toBe("QWEDWQASJ_2");
  });

  it("extracts only the text after the last backslash for ReferenceTestPathName (Test 3)", () => {
    const rows = transform([
      ["P1", "PPID", "P1"],
      ["P1", "TS#3_ReferenceTestPathName", "AAAA\\BBBB\\PATH_003"],
    ]);
    const row = rows.find((r) => r["TS#"] === "TS#3")!;
    expect(row.ReferenceTestPathName).toBe("PATH_003");
  });

  it("uses the dash placeholder when PreProcess is missing for that TS# (Test 5)", () => {
    const rows = transform([
      ["P1", "PPID", "P1"],
      ["P1", "TS#3_ReferenceTestPathName", "PATH_003"],
    ]);
    const row = rows.find((r) => r["TS#"] === "TS#3")!;
    expect(row.PreProcess).toBe("-");
  });

  it("uses the dash placeholder when ReferenceTestPathName is missing for that TS# (Test 6)", () => {
    const rows = transform([
      ["P1", "PPID", "P1"],
      ["P1", "TS#3_PreProcess", "PRE_PROCESS_01"],
    ]);
    const row = rows.find((r) => r["TS#"] === "TS#3")!;
    expect(row.ReferenceTestPathName).toBe("-");
  });

  it("uses only the matching TS# block, never an adjacent one (Test 7)", () => {
    const rows = transform([
      ["P1", "PPID", "P1"],
      ["P1", "TS#1_PreProcess", "PRE_1"],
      ["P1", "TS#2_PreProcess", "PRE_2"],
      ["P1", "TS#3_PreProcess", "PRE_3"],
      ["P1", "TS#1_ReferenceTestPathName", "REF_1"],
      ["P1", "TS#2_ReferenceTestPathName", "REF_2"],
      ["P1", "TS#3_ReferenceTestPathName", "REF_3"],
    ]);
    const row = rows.find((r) => r["TS#"] === "TS#2")!;
    expect(row.PreProcess).toBe("PRE_2");
    expect(row.ReferenceTestPathName).toBe("REF_2");
  });

  it("completes the end-to-end example from the spec (both fields, both with backslashes)", () => {
    const rows = transform([
      ["P1", "PPID", "P1"],
      ["P1", "TS#1_PreProcess", "IGNORED_1"],
      ["P1", "TS#3_PreProcess", "%%%%\\PROCESS\\QWEDWQASJ_2"],
      ["P1", "TS#1_ReferenceTestPathName", "IGNORED_1"],
      ["P1", "TS#3_ReferenceTestPathName", "AAAA\\REFERENCE\\PATH_003"],
    ]);
    const row = rows.find((r) => r["TS#"] === "TS#3")!;
    expect(row.PreProcess).toBe("QWEDWQASJ_2");
    expect(row.ReferenceTestPathName).toBe("PATH_003");
  });

  it("does not throw on backslash edge cases not expected in real RCC data", () => {
    const rows = transform([
      ["P1", "PPID", "P1"],
      ["P1", "TS#1_PreProcess", "TRAILING\\"],
      ["P1", "TS#1_ReferenceTestPathName", "DOUBLE\\\\SLASH"],
    ]);
    const row = rows[0];
    expect(row.PreProcess).toBe("");
    expect(row.ReferenceTestPathName).toBe("SLASH");
  });
});

describe("summarize", () => {
  it("reports ppid_count/ts_count/generated_rows and rounds elapsed time", () => {
    const rows = transform(SAMPLE_ROWS);
    const summary = summarize(rows, 1.23456);
    expect(summary.ppid_count).toBe(2);
    expect(summary.ts_count).toBe(rows.length);
    expect(summary.generated_rows).toBe(rows.length);
    expect(summary.conversion_time_seconds).toBe(1.23);
  });

  it("reports zero ppid_count for an empty result", () => {
    const summary = summarize([], 0);
    expect(summary.ppid_count).toBe(0);
    expect(summary.generated_rows).toBe(0);
  });
});
