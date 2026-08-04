/**
 * Transformation Rule model + persistence.
 *
 * Rules are stored client-side only (localStorage) - the backend stays
 * stateless (no database, consistent with V1.01/V1.02) and only ever
 * *applies* a rule that's passed to it (see /api/export). Internal field
 * names never change; a rule only controls which columns show, their
 * order, and their display label (alias).
 */

export const BASE_COLUMNS = [
  "PPID",
  "TS#",
  "CardName",
  "FilmMaterial",
  "CorrelationCard_1",
  "CorrelationCard_2",
  "CorrelationCard_3",
  "DataCombination",
  "DataFeedFoward",
] as const;

export type TransformationRule = {
  id: string;
  rule_name: string;
  output_columns: string[];
  column_order: string[];
  aliases: Record<string, string>;
};

export const DEFAULT_RULE: TransformationRule = {
  id: "default",
  rule_name: "Default",
  output_columns: [...BASE_COLUMNS],
  column_order: [...BASE_COLUMNS],
  aliases: {},
};

const STORAGE_KEY = "excel-automation.rules.v1";
const ACTIVE_RULE_KEY = "excel-automation.activeRuleId.v1";

function isBrowser() {
  return typeof window !== "undefined";
}

function readStore(): TransformationRule[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStore(rules: TransformationRule[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
}

export function listRules(): TransformationRule[] {
  return [DEFAULT_RULE, ...readStore()];
}

export function getActiveRuleId(): string {
  if (!isBrowser()) return DEFAULT_RULE.id;
  return window.localStorage.getItem(ACTIVE_RULE_KEY) ?? DEFAULT_RULE.id;
}

export function setActiveRuleId(id: string) {
  if (!isBrowser()) return;
  window.localStorage.setItem(ACTIVE_RULE_KEY, id);
}

export function getRuleById(id: string): TransformationRule {
  return listRules().find((r) => r.id === id) ?? DEFAULT_RULE;
}

function makeId(name: string): string {
  const base = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "rule";
  return `${base}-${Date.now().toString(36)}`;
}

export function saveRule(rule: Omit<TransformationRule, "id">): TransformationRule {
  const rules = readStore();
  const saved: TransformationRule = { ...rule, id: makeId(rule.rule_name) };
  writeStore([...rules, saved]);
  return saved;
}

export function updateRule(rule: TransformationRule): TransformationRule {
  if (rule.id === DEFAULT_RULE.id) {
    // Default is not user-editable in place - save as a new rule instead.
    return saveRule(rule);
  }
  const rules = readStore().map((r) => (r.id === rule.id ? rule : r));
  writeStore(rules);
  return rule;
}

export function deleteRule(id: string) {
  if (id === DEFAULT_RULE.id) return;
  writeStore(readStore().filter((r) => r.id !== id));
  if (getActiveRuleId() === id) setActiveRuleId(DEFAULT_RULE.id);
}

export function exportRuleJson(rule: TransformationRule): string {
  const { rule_name, output_columns, column_order, aliases } = rule;
  return JSON.stringify({ rule_name, output_columns, column_order, aliases }, null, 2);
}

export function importRuleFromJson(json: string): Omit<TransformationRule, "id"> {
  const parsed = JSON.parse(json);
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("Rule JSON must be an object.");
  }
  const known = new Set<string>(BASE_COLUMNS);
  const output_columns = Array.isArray(parsed.output_columns)
    ? parsed.output_columns.filter((c: unknown) => typeof c === "string" && known.has(c))
    : [...BASE_COLUMNS];
  const column_order = Array.isArray(parsed.column_order)
    ? parsed.column_order.filter((c: unknown) => typeof c === "string" && known.has(c))
    : output_columns;
  const aliases: Record<string, string> = {};
  if (typeof parsed.aliases === "object" && parsed.aliases !== null) {
    for (const [k, v] of Object.entries(parsed.aliases as Record<string, unknown>)) {
      if (known.has(k) && typeof v === "string" && v.trim() !== "") aliases[k] = v;
    }
  }

  return {
    rule_name: typeof parsed.rule_name === "string" && parsed.rule_name.trim() ? parsed.rule_name : "Imported Rule",
    output_columns: output_columns.length ? output_columns : [...BASE_COLUMNS],
    column_order: column_order.length ? column_order : output_columns.length ? output_columns : [...BASE_COLUMNS],
    aliases,
  };
}

/** Ensures column_order lists every known column (missing ones appended) so
 * the rule editor's drag list always has a complete, stable set of rows to
 * show - independent of which ones are currently enabled. */
export function normalizeForEditing(rule: TransformationRule): TransformationRule {
  const order = [...rule.column_order];
  for (const c of BASE_COLUMNS) {
    if (!order.includes(c)) order.push(c);
  }
  return { ...rule, column_order: order.filter((c) => (BASE_COLUMNS as readonly string[]).includes(c)) };
}

/** Ordered, enabled-only column list a rule actually renders, with fallbacks
 * identical in spirit to the backend's rule_manager.validate_rule(). */
export function resolveDisplayColumns(rule: TransformationRule): { field: string; header: string }[] {
  const known = new Set<string>(BASE_COLUMNS);
  const enabled = new Set(rule.output_columns.filter((c) => known.has(c)));
  const effectiveEnabled = enabled.size > 0 ? enabled : new Set<string>(BASE_COLUMNS);

  const ordered = rule.column_order.filter((c) => effectiveEnabled.has(c));
  for (const c of effectiveEnabled) {
    if (!ordered.includes(c)) ordered.push(c);
  }

  return ordered.map((field) => ({ field, header: rule.aliases[field]?.trim() || field }));
}
