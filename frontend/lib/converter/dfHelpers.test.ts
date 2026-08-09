import { describe, it, expect } from "vitest";
import { findInsertPosition, insertFieldAfter } from "./dfHelpers";

// Mirrors backend/tests/test_df_helpers.py.

describe("findInsertPosition", () => {
  it("returns the position immediately after the anchor", () => {
    expect(findInsertPosition(["PPID", "TS#", "CardName"], "PPID")).toBe(1);
  });

  it("falls back to the end when the anchor is absent", () => {
    expect(findInsertPosition(["TS#", "CardName"], "PPID")).toBe(2);
  });
});

describe("insertFieldAfter", () => {
  it("places the field right after the anchor", () => {
    expect(insertFieldAfter(["PPID", "TS#", "CardName"], "DESC", "PPID")).toEqual([
      "PPID",
      "DESC",
      "TS#",
      "CardName",
    ]);
  });

  it("appends at the end when the anchor is absent", () => {
    expect(insertFieldAfter(["TS#", "CardName"], "DESC", "PPID")).toEqual(["TS#", "CardName", "DESC"]);
  });

  it("never mutates the input array", () => {
    const columns = ["PPID", "TS#"];
    const snapshot = [...columns];
    insertFieldAfter(columns, "DESC", "PPID");
    expect(columns).toEqual(snapshot);
  });
});
