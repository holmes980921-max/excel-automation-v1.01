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
  it("returns all 9 base columns, no aliases, for the default rule", () => {
    const cols = resolveDisplayColumns(DEFAULT_RULE);
    expect(cols).toHaveLength(9);
    expect(cols.every((c) => c.field === c.header)).toBe(true);
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
    expect(resolveDisplayColumns(rule)).toHaveLength(9);
  });
});

describe("normalizeForEditing", () => {
  it("fills column_order out to all 9 base columns", () => {
    const partial: TransformationRule = {
      id: "z",
      rule_name: "Partial",
      output_columns: ["PPID"],
      column_order: ["PPID"],
      aliases: {},
    };
    expect(normalizeForEditing(partial).column_order).toHaveLength(9);
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
