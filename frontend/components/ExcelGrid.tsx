"use client";

import { useMemo } from "react";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry, AllCommunityModule, type ColDef, type CellClickedEvent } from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";
import { compareValues } from "@/lib/naturalCompare";
import { resolveDisplayColumns, type TransformationRule } from "@/lib/rules";

// V1.12: the one column Film Material Visualization hooks into - internal
// field name, unaffected by a Transformation Rule's display alias.
const FILM_MATERIAL_FIELD = "FilmMaterial";

ModuleRegistry.registerModules([AllCommunityModule]);

type ExtraColumn = {
  field: string;
  header: string;
  /** Field to splice this column in right after (e.g. DESC after PPID,
   * V1.07 "PPID | DESC | ..." placement). Falls back to appending at the
   * end when that field isn't part of the currently active display
   * columns (no natural anchor to insert after). Must match the backend's
   * equivalent placement in /api/export exactly - see routes.py's
   * export_rows() - so Preview always equals Export. */
  insertAfterField?: string;
};

type Props = {
  /** Already search-filtered and Preview-Rows-sliced by the caller (see
   * app/page.tsx) - this component just renders whatever it's given, it
   * no longer does its own filtering. */
  rows: Record<string, unknown>[];
  rule: TransformationRule;
  /** Columns that aren't part of the TransformationRule system (currently
   * just DESC from Add Description, V1.06/V1.07) - shown whenever present,
   * independent of the active rule. */
  extraColumns?: ExtraColumn[];
  /** V1.12: called with the raw cell value when a non-empty filmmaterial
   * cell is clicked. Optional so ExcelGrid has no hard dependency on the
   * visualization feature - omitting it just means the column isn't
   * clickable, nothing else about the grid changes. */
  onFilmMaterialClick?: (value: string) => void;
};

export default function ExcelGrid({ rows, rule, extraColumns = [], onFilmMaterialClick }: Props) {
  const columnDefs = useMemo<ColDef[]>(() => {
    const displayColumns = resolveDisplayColumns(rule);

    const rowNumberCol: ColDef = {
      headerName: "#",
      colId: "__rowNumber",
      valueGetter: (params) => (params.node?.rowIndex ?? 0) + 1,
      pinned: "left",
      width: 60,
      sortable: false,
      filter: false,
      resizable: false,
      suppressMovable: true,
      cellClass: "row-number-cell",
    };

    const toColDef = (field: string, header: string, pinnedFirst: boolean): ColDef => {
      const colDef: ColDef = {
        field,
        headerName: header,
        pinned: pinnedFirst ? "left" : undefined,
        resizable: true,
        sortable: true,
        filter: true,
        minWidth: 90,
        comparator: (a, b) => compareValues(a, b),
        valueFormatter: (params) => (params.value === null || params.value === undefined ? "" : String(params.value)),
      };

      // V1.12: filmmaterial values get a pointer cursor - independent of
      // whether the Material DB actually loaded/validated successfully,
      // so the column always behaves consistently; a DB problem only
      // changes what the modal itself shows (see
      // FilmMaterialVisualizationDialog). The click itself is wired at
      // the grid level (onGridCellClicked below), not per-column - AG
      // Grid's per-colDef onCellClicked is documented but the grid-level
      // handler is the more standard, more reliably-invoked hook.
      if (field === FILM_MATERIAL_FIELD && onFilmMaterialClick) {
        colDef.cellStyle = (params) =>
          typeof params.value === "string" && params.value.trim() ? { cursor: "pointer" } : null;
      }

      return colDef;
    };

    const dataCols = displayColumns.map(({ field, header }, index) => toColDef(field, header, index === 0));

    const cols = [rowNumberCol, ...dataCols];
    for (const extra of extraColumns) {
      const colDef = toColDef(extra.field, extra.header, false);
      const anchorIndex = extra.insertAfterField
        ? cols.findIndex((c) => c.field === extra.insertAfterField)
        : -1;
      if (anchorIndex !== -1) {
        cols.splice(anchorIndex + 1, 0, colDef);
      } else {
        cols.push(colDef);
      }
    }

    return cols;
  }, [rule, extraColumns, onFilmMaterialClick]);

  const defaultColDef = useMemo<ColDef>(
    () => ({
      resizable: true,
      sortable: true,
      filter: true,
      minWidth: 80,
    }),
    []
  );

  const handleCellClicked = (event: CellClickedEvent) => {
    if (event.colDef.field !== FILM_MATERIAL_FIELD || !onFilmMaterialClick) return;
    if (typeof event.value === "string" && event.value.trim()) onFilmMaterialClick(event.value);
  };

  return (
    <div className="ag-theme-quartz excel-grid" style={{ width: "100%", height: "100%" }}>
      <AgGridReact
        theme="legacy"
        rowData={rows}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        rowSelection={{ mode: "singleRow" }}
        animateRows
        onCellClicked={handleCellClicked}
      />
    </div>
  );
}
