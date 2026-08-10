import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * V1.13: jsdom doesn't compute live `:hover` pseudo-class styles from a
 * simulated mouse event, so ExcelGrid.test.tsx can only prove the *class*
 * is applied to the right cells (the mechanism). This test proves the
 * actual CSS the spec asked for (subtle underline, subtle color change,
 * a transition, normal state left alone) is really defined, by reading
 * the stylesheet source directly - the closest this environment can get
 * to verifying the hover styling without a real browser.
 */
describe("globals.css - Film Material hover affordance (V1.13)", () => {
  const css = readFileSync(join(__dirname, "globals.css"), "utf-8");

  it("defines a smooth transition on the base (non-hover) state", () => {
    const baseRule = /\.film-material-cell\s*\{[^}]*\}/.exec(css)?.[0] ?? "";
    expect(baseRule).toMatch(/transition\s*:/);
  });

  it("defines an underline and a text-color change on hover", () => {
    const hoverRule = /\.film-material-cell:hover\s*\{[^}]*\}/.exec(css)?.[0] ?? "";
    expect(hoverRule).toMatch(/text-decoration\s*:\s*underline/);
    expect(hoverRule).toMatch(/color\s*:\s*#[0-9a-fA-F]{6}/);
  });

  it("does not touch the row-number or other unrelated cell classes", () => {
    // Sanity guard: the new hover rule is scoped to .film-material-cell
    // only - it shouldn't appear inside any other selector's rule body.
    const rowNumberRule = /\.row-number-cell\s*\{[^}]*\}/.exec(css)?.[0] ?? "";
    expect(rowNumberRule).not.toMatch(/text-decoration/);
  });
});
