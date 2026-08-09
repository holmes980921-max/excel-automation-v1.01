import { describe, it, expect } from "vitest";
import { mergeDescription, InvalidExcelFormatError } from "./descriptionMerger";

// Mirrors backend/tests/test_description_merge.py.

function rowsData() {
  return [
    { PPID: "AB000010_1", "TS#": "TS#1", CardName: "CARD1" },
    { PPID: "AB000010_1", "TS#": "TS#2", CardName: "CARD1" },
    { PPID: "AB000020_1", "TS#": "TS#1", CardName: "CARDX" },
  ];
}

describe("mergeDescription", () => {
  it("adds DESC to every matching row", () => {
    const result = mergeDescription(rowsData(), [
      { PPID: "AB000010_1", DESC: "First PPID" },
      { PPID: "AB000020_1", DESC: "Second PPID" },
    ]);
    expect(result.rows.map((r) => r.DESC)).toEqual(["First PPID", "First PPID", "Second PPID"]);
    expect(result.matchedCount).toBe(2);
    expect(result.unmatchedCount).toBe(0);
    expect(result.unmatchedPpids).toEqual([]);
  });

  it("places DESC immediately after PPID", () => {
    const result = mergeDescription(rowsData(), [{ PPID: "AB000010_1", DESC: "First PPID" }]);
    expect(result.fields).toEqual(["PPID", "DESC", "TS#", "CardName"]);
  });

  it("places DESC after PPID regardless of PPID's original position", () => {
    const rows = [{ "TS#": "TS#1", PPID: "AB000010_1", CardName: "C" }];
    const result = mergeDescription(rows, [{ PPID: "AB000010_1", DESC: "First PPID" }]);
    expect(result.fields).toEqual(["TS#", "PPID", "DESC", "CardName"]);
  });

  it("is a left join - unmatched rows get the missing-value placeholder", () => {
    const result = mergeDescription(rowsData(), [{ PPID: "AB000010_1", DESC: "First PPID" }]);
    expect(result.rows.map((r) => r.DESC)).toEqual(["First PPID", "First PPID", "-"]);
    expect(result.matchedCount).toBe(1);
    expect(result.unmatchedCount).toBe(1);
    expect(result.unmatchedPpids).toEqual(["AB000020_1"]);
  });

  it("never mutates the input rows", () => {
    const original = rowsData();
    const snapshot = JSON.parse(JSON.stringify(original));
    mergeDescription(original, [{ PPID: "AB000010_1", DESC: "First PPID" }]);
    expect(original).toEqual(snapshot);
  });

  it("rejects duplicate PPIDs in the description data", () => {
    expect(() =>
      mergeDescription(rowsData(), [
        { PPID: "AB000010_1", DESC: "A" },
        { PPID: "AB000010_1", DESC: "B" },
      ])
    ).toThrow(/duplicate/i);
    expect(() =>
      mergeDescription(rowsData(), [
        { PPID: "AB000010_1", DESC: "A" },
        { PPID: "AB000010_1", DESC: "B" },
      ])
    ).toThrow(InvalidExcelFormatError);
  });

  it("requires a PPID column in the base rows", () => {
    expect(() => mergeDescription([{ "TS#": "TS#1" }], [{ PPID: "AB000010_1", DESC: "A" }])).toThrow(/PPID/);
  });
});
