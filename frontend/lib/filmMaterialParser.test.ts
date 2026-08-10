import { describe, it, expect } from "vitest";
import { parseFilmMaterialValue } from "./filmMaterialParser";
import { parseMaterialDbCsv, type MaterialDbOk } from "./materialDb";

const FULL_MOCK_DB_CSV = [
  "Material Code,Color",
  "A,#F4D03F",
  "B,#8E44AD",
  "C,#5DADE2",
  "D,#E67E22",
  "AB,#2ECC71",
  "Si,#34495E",
].join("\n");

// Case 1 deliberately excludes "AB" - it's testing basic character-by-
// character tokenization and the default-Si-bottom behavior in isolation,
// not Longest Match First (which Case 2 owns and explicitly names as the
// critical case). With "AB" registered, "ABC" would correctly tokenize as
// AB+C per Longest Match First (section 9) - not A+B+C - so Case 1 uses a
// DB without that 2-character code to test what it's actually meant to
// test, without the two rules' example inputs contradicting each other.
const DB_WITHOUT_AB_CSV = ["Material Code,Color", "A,#F4D03F", "B,#8E44AD", "C,#5DADE2", "D,#E67E22", "Si,#34495E"].join("\n");

function dbFrom(csv: string): MaterialDbOk {
  const result = parseMaterialDbCsv(csv);
  if (result.status !== "ok") throw new Error("mock DB fixture is broken");
  return result;
}

const fullDb = () => dbFrom(FULL_MOCK_DB_CSV);
const dbWithoutAB = () => dbFrom(DB_WITHOUT_AB_CSV);

// The five required test cases (spec section 16).
describe("parseFilmMaterialValue - required cases", () => {
  it("Case 1 - basic structure, default Si bottom", () => {
    const result = parseFilmMaterialValue("MOCK_ABC_001_X_002", dbWithoutAB());
    expect(result).toEqual({ status: "ok", layers: ["A", "B", "C", "Si"] });
  });

  it("Case 2 - longest match (AB, not A then B) - the critical case", () => {
    const result = parseFilmMaterialValue("MOCK_ABCDBA_001_X_002", fullDb());
    expect(result).toEqual({ status: "ok", layers: ["AB", "C", "D", "B", "A", "Si"] });
  });

  it("Case 3 - repeated material stays as separate layers", () => {
    const result = parseFilmMaterialValue("MOCK_BABCDB_001_X_002", fullDb());
    expect(result).toEqual({ status: "ok", layers: ["B", "AB", "C", "D", "B", "Si"] });
  });

  it("Case 4 - explicit Bottom Material", () => {
    const result = parseFilmMaterialValue("MOCK_ABCDBA_Si_001_X_002", fullDb());
    expect(result).toEqual({ status: "ok", layers: ["AB", "C", "D", "B", "A", "Si"] });
  });

  it("Case 5 - unknown Material reports a clean error, no partial structure", () => {
    const result = parseFilmMaterialValue("MOCK_ABXCD_001_X_002", fullDb());
    expect(result).toEqual({ status: "error", unknownMaterial: "X" });
  });
});

// Additional cases (spec section 17).
describe("parseFilmMaterialValue - additional cases", () => {
  it("treats a non-registered third field as a regular field, not a Bottom override (default Si)", () => {
    const result = parseFilmMaterialValue("MOCK_DC_999_Y_111", fullDb());
    expect(result).toEqual({ status: "ok", layers: ["D", "C", "Si"] });
  });

  it("accepts a non-Si Material Code as an explicit Bottom", () => {
    const result = parseFilmMaterialValue("MOCK_DC_A_001_X_002", fullDb());
    expect(result).toEqual({ status: "ok", layers: ["D", "C", "A"] });
  });

  it("orders layers TOP to BOTTOM matching the structure's left-to-right reading order", () => {
    const result = parseFilmMaterialValue("MOCK_DCBA_001_X_002", fullDb());
    expect(result).toEqual({ status: "ok", layers: ["D", "C", "B", "A", "Si"] });
  });

  it("reports only the single unmatched character, not the whole remaining string", () => {
    const result = parseFilmMaterialValue("MOCK_ABQRS_001_X_002", fullDb());
    expect(result).toEqual({ status: "error", unknownMaterial: "Q" });
  });

  it("does not guess when the value has no structure field at all", () => {
    const result = parseFilmMaterialValue("MOCK", fullDb());
    expect(result.status).toBe("error");
  });
});
