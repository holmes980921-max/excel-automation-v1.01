import { describe, it, expect } from "vitest";
import { applyRule, validateRule } from "./ruleManager";
import { FULL_OUTPUT_COLUMNS } from "./constants";
import { DEFAULT_RULE, type TransformationRule } from "@/lib/rules";

// Mirrors backend/tests/test_rule_manager.py.

describe("applyRule", () => {
  it("reproduces the full unshaped column set for the Default rule", () => {
    const shaped = applyRule(FULL_OUTPUT_COLUMNS, DEFAULT_RULE);
    expect(shaped.fields).toEqual(FULL_OUTPUT_COLUMNS);
    expect(shaped.headers).toEqual(FULL_OUTPUT_COLUMNS);
  });

  it("falls back to Default when no rule is given", () => {
    const shaped = applyRule(FULL_OUTPUT_COLUMNS, null);
    expect(shaped.fields).toEqual(FULL_OUTPUT_COLUMNS);
  });

  it("selects, reorders, and aliases columns per a custom rule", () => {
    const rule: TransformationRule = {
      id: "engineering",
      rule_name: "Engineering",
      output_columns: ["PPID", "TS#", "FilmMaterial", "CardName"],
      column_order: ["PPID", "FilmMaterial", "CardName", "TS#"],
      aliases: { PPID: "Recipe Name", CardName: "Card" },
    };
    const shaped = applyRule(FULL_OUTPUT_COLUMNS, rule);
    expect(shaped.fields).toEqual(["PPID", "FilmMaterial", "CardName", "TS#"]);
    expect(shaped.headers).toEqual(["Recipe Name", "FilmMaterial", "Card", "TS#"]);
  });

  it("drops unknown columns instead of failing", () => {
    const rule: TransformationRule = {
      id: "x",
      rule_name: "x",
      output_columns: ["PPID", "NotAField"],
      column_order: ["NotAField", "PPID"],
      aliases: {},
    };
    const shaped = applyRule(FULL_OUTPUT_COLUMNS, rule);
    expect(shaped.fields).toEqual(["PPID"]);
  });

  it("falls back to the full column set when the rule is empty", () => {
    const rule: TransformationRule = { id: "x", rule_name: "x", output_columns: [], column_order: [], aliases: {} };
    const shaped = applyRule(FULL_OUTPUT_COLUMNS, rule);
    expect(shaped.fields).toEqual(FULL_OUTPUT_COLUMNS);
  });
});

describe("validateRule", () => {
  it("drops an alias for a column not in the known set", () => {
    const rule: TransformationRule = {
      id: "x",
      rule_name: "x",
      output_columns: ["PPID"],
      column_order: ["PPID"],
      aliases: { PPID: "Recipe", NotAField: "Ignored" },
    };
    const normalized = validateRule(rule);
    expect(normalized.aliases).toEqual({ PPID: "Recipe" });
  });

  it("names an untitled rule 'Untitled Rule'", () => {
    const rule: TransformationRule = { id: "x", rule_name: "", output_columns: [], column_order: [], aliases: {} };
    expect(validateRule(rule).rule_name).toBe("Untitled Rule");
  });
});
