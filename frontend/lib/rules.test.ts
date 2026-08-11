import { describe, it, expect } from "vitest";
import {
  DEFAULT_RULE,
  resolveDisplayColumns,
  normalizeForEditing,
  importRuleFromJson,
  exportRuleJson,
  type TransformationRule,
} from "./rules";

describe("resolveDisplayColumns", () => {
  it("returns all 11 base columns for the default rule, header equal to field except the two V1.14 renamed columns", () => {
    const cols = resolveDisplayColumns(DEFAULT_RULE);
    expect(cols).toHaveLength(11);
    const renamed = new Set(["PreProcess", "ReferenceTestPathName"]);
    expect(cols.every((c) => renamed.has(c.field) || c.field === c.header)).toBe(true);
  });

  it("V1.14: final output column order and headers exactly match the spec (Test 8)", () => {
    const cols = resolveDisplayColumns(DEFAULT_RULE);
    expect(cols.map((c) => c.field)).toEqual([
      "PPID",
      "TS#",
      "CardName",
      "FilmMaterial",
      "CorrelationCard_1",
      "CorrelationCard_2",
      "CorrelationCard_3",
      "DataCombination",
      "PreProcess",
      "DataFeedFoward",
      "ReferenceTestPathName",
    ]);
    expect(cols.map((c) => c.header)).toEqual([
      "PPID",
      "TS#",
      "CardName",
      "FilmMaterial",
      "CorrelationCard_1",
      "CorrelationCard_2",
      "CorrelationCard_3",
      "DataCombination",
      "CB-Pre-PPID",
      "DataFeedFoward",
      "DFF-Pre-PPID",
    ]);
  });

  it("V1.14: an explicit alias still overrides the default CB-Pre-PPID/DFF-Pre-PPID header", () => {
    const rule: TransformationRule = {
      id: "z2",
      rule_name: "Custom",
      output_columns: ["PPID", "PreProcess"],
      column_order: ["PPID", "PreProcess"],
      aliases: { PreProcess: "My Custom Header" },
    };
    const cols = resolveDisplayColumns(rule);
    expect(cols.find((c) => c.field === "PreProcess")?.header).toBe("My Custom Header");
  });

  it("respects custom order and aliases", () => {
    const rule: TransformationRule = {
      id: "x",
      rule_name: "Engineering",
      output_columns: ["PPID", "TS#", "FilmMaterial", "CardName"],
      column_order: ["PPID", "FilmMaterial", "CardName", "TS#"],
      aliases: { PPID: "Recipe Name", CardName: "Card" },
    };
    const cols = resolveDisplayColumns(rule);
    expect(cols.map((c) => c.field)).toEqual(["PPID", "FilmMaterial", "CardName", "TS#"]);
    expect(cols[0].header).toBe("Recipe Name");
    expect(cols[2].header).toBe("Card");
  });

  it("falls back to the full column set when nothing is enabled", () => {
    const rule: TransformationRule = { id: "y", rule_name: "Empty", output_columns: [], column_order: [], aliases: {} };
    expect(resolveDisplayColumns(rule)).toHaveLength(11);
  });
});

describe("normalizeForEditing", () => {
  it("fills column_order out to all 11 base columns", () => {
    const partial: TransformationRule = {
      id: "z",
      rule_name: "Partial",
      output_columns: ["PPID"],
      column_order: ["PPID"],
      aliases: {},
    };
    expect(normalizeForEditing(partial).column_order).toHaveLength(11);
  });
});

describe("rule JSON import/export", () => {
  const rule: TransformationRule = {
    id: "x",
    rule_name: "Engineering",
    output_columns: ["PPID", "TS#", "FilmMaterial", "CardName"],
    column_order: ["PPID", "FilmMaterial", "CardName", "TS#"],
    aliases: { PPID: "Recipe Name", CardName: "Card" },
  };

  it("round-trips through export/import", () => {
    const imported = importRuleFromJson(exportRuleJson(rule));
    expect(imported.rule_name).toBe("Engineering");
    expect(imported.column_order).toEqual(rule.column_order);
    expect(imported.aliases).toEqual(rule.aliases);
  });

  it("drops unknown columns instead of throwing", () => {
    const json = JSON.stringify({
      rule_name: "Bad",
      output_columns: ["PPID", "NotAField"],
      column_order: ["NotAField", "PPID"],
      aliases: { NotAField: "x" },
    });
    const imported = importRuleFromJson(json);
    expect(imported.output_columns).toEqual(["PPID"]);
    expect(imported.aliases).toEqual({});
  });
});
