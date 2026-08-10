import { describe, it, expect, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import ExcelGrid from "./ExcelGrid";
import { DEFAULT_RULE } from "@/lib/rules";

function sampleRow(filmMaterial: string) {
  return {
    PPID: "X1",
    "TS#": "TS#1",
    CardName: "C1",
    FilmMaterial: filmMaterial,
    CorrelationCard_1: "-",
    CorrelationCard_2: "-",
    CorrelationCard_3: "-",
    DataCombination: "-",
    DataFeedFoward: "-",
  };
}

/** AG Grid puts a `col-id` attribute on both the header cell
 * (role="columnheader") and every body cell (role="gridcell") for a given
 * column - `role="gridcell"` disambiguates to the actual data cell, which
 * is what `onCellClicked` fires from. A more reliable way to target a
 * specific column's data cell than text content, since several columns
 * can share the same displayed value (e.g. the "-" missing-value
 * placeholder). */
async function findCell(container: HTMLElement, colId: string): Promise<HTMLElement> {
  return waitFor(() => {
    const cell = container.querySelector(`[role="gridcell"][col-id="${colId}"]`);
    if (!cell) throw new Error(`no data cell rendered yet for col-id="${colId}"`);
    return cell as HTMLElement;
  });
}

// V1.12: Film Material Visualization click wiring - the rest of ExcelGrid
// (column selection/order/aliasing, natural sort, row numbers) is
// unchanged from V1.10/V1.11 and already covered indirectly through
// app/page.test.tsx; these tests cover only what's new.
describe("ExcelGrid - Film Material Visualization click wiring (V1.12)", () => {
  it("calls onFilmMaterialClick with the raw cell value when a filmmaterial cell is clicked", async () => {
    const onFilmMaterialClick = vi.fn();
    const { container } = render(
      <ExcelGrid rows={[sampleRow("MOCK_ABC_001_X_002")]} rule={DEFAULT_RULE} onFilmMaterialClick={onFilmMaterialClick} />
    );

    const cell = await findCell(container, "FilmMaterial");
    cell.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

    await waitFor(() => expect(onFilmMaterialClick).toHaveBeenCalledWith("MOCK_ABC_001_X_002"));
  });

  it("does not call the handler for an empty/missing filmmaterial value", async () => {
    const onFilmMaterialClick = vi.fn();
    const { container } = render(<ExcelGrid rows={[sampleRow("-")]} rule={DEFAULT_RULE} onFilmMaterialClick={onFilmMaterialClick} />);

    const cell = await findCell(container, "FilmMaterial");
    cell.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

    expect(onFilmMaterialClick).not.toHaveBeenCalled();
  });

  it("does not throw when onFilmMaterialClick is omitted (existing V1.10/V1.11 callers unaffected)", async () => {
    const { container } = render(<ExcelGrid rows={[sampleRow("MOCK_ABC_001_X_002")]} rule={DEFAULT_RULE} />);
    const cell = await findCell(container, "FilmMaterial");
    expect(() => cell.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }))).not.toThrow();
  });

  it("does not wire click behavior onto a non-filmmaterial column", async () => {
    const onFilmMaterialClick = vi.fn();
    const { container } = render(
      <ExcelGrid rows={[sampleRow("MOCK_ABC_001_X_002")]} rule={DEFAULT_RULE} onFilmMaterialClick={onFilmMaterialClick} />
    );

    const cardNameCell = await findCell(container, "CardName");
    cardNameCell.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

    expect(onFilmMaterialClick).not.toHaveBeenCalled();
  });
});
