import { describe, it, expect } from "vitest";
import { generateDefaultFilename } from "./filename";

describe("generateDefaultFilename", () => {
  it("formats as RCC_converted_YYMMDD_HHMMSS.xlsx", () => {
    const date = new Date(2026, 7, 7, 18, 36, 7); // 2026-08-07 18:36:07 (local)
    expect(generateDefaultFilename(date)).toBe("RCC_converted_260807_183607.xlsx");
  });

  it("zero-pads single-digit month/day/hour/minute/second", () => {
    const date = new Date(2027, 0, 2, 3, 4, 5); // 2027-01-02 03:04:05
    expect(generateDefaultFilename(date)).toBe("RCC_converted_270102_030405.xlsx");
  });

  it("defaults to the current time when no date is given", () => {
    const name = generateDefaultFilename();
    expect(name).toMatch(/^RCC_converted_\d{6}_\d{6}\.xlsx$/);
  });
});
