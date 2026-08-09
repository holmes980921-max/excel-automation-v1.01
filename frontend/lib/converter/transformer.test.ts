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
