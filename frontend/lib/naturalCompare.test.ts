import { describe, it, expect } from "vitest";
import { naturalCompare, compareValues } from "./naturalCompare";

describe("naturalCompare", () => {
  it("sorts TS# labels numerically, not lexicographically", () => {
    const values = ["TS#1", "TS#10", "TS#2", "TS#3", "TS#9"];
    const sorted = [...values].sort(naturalCompare);
    expect(sorted).toEqual(["TS#1", "TS#2", "TS#3", "TS#9", "TS#10"]);
  });

  it("sorts PPID-style values with embedded digit runs numerically", () => {
    const values = ["AB000010_1", "AB000002_1", "AB000100_1"];
    const sorted = [...values].sort(naturalCompare);
    expect(sorted).toEqual(["AB000002_1", "AB000010_1", "AB000100_1"]);
  });

  it("is case-insensitive for non-numeric chunks", () => {
    expect(naturalCompare("abc", "ABC")).toBe(0);
  });

  it("treats equal strings as equal", () => {
    expect(naturalCompare("TS#1", "TS#1")).toBe(0);
  });
});

describe("compareValues", () => {
  it("handles null/undefined as empty string", () => {
    expect(compareValues(null, undefined)).toBe(0);
    expect(compareValues(null, "a")).toBeLessThan(0);
  });

  it("compares numeric-looking values numerically via chunking", () => {
    expect(compareValues(2, 10)).toBeLessThan(0);
    expect(compareValues("2", "10")).toBeLessThan(0);
  });
});
