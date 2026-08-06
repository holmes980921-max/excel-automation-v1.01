import { describe, it, expect } from "vitest";
import { filterRows } from "./searchFilter";

const ROWS = [
  { PPID: "AB000010_1", CardName: "CARD1" },
  { PPID: "AB000020_1", CardName: "CARDX" },
  { PPID: "AB000030_1", CardName: "CARD1" },
];

describe("filterRows", () => {
  it("returns all rows when the query is empty or whitespace", () => {
    expect(filterRows(ROWS, "")).toEqual(ROWS);
    expect(filterRows(ROWS, "   ")).toEqual(ROWS);
  });

  it("matches case-insensitively across any column", () => {
    expect(filterRows(ROWS, "cardx")).toEqual([ROWS[1]]);
  });

  it("matches substrings, not just whole values", () => {
    expect(filterRows(ROWS, "0002")).toEqual([ROWS[1]]);
  });

  it("returns every row whose any field matches", () => {
    expect(filterRows(ROWS, "CARD1")).toEqual([ROWS[0], ROWS[2]]);
  });

  it("treats null/undefined field values as non-matching", () => {
    const rows = [{ PPID: "X1", DESC: null }, { PPID: "X2", DESC: "note" }];
    expect(filterRows(rows, "note")).toEqual([rows[1]]);
  });

  it("returns an empty array when nothing matches", () => {
    expect(filterRows(ROWS, "zzz")).toEqual([]);
  });
});
