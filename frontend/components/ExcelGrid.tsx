"use client";

import { useMemo } from "react";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry, AllCommunityModule, type ColDef } from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";
import { compareValues } from "@/lib/naturalCompare";
import { resolveDisplayColumns, type TransformationRule } from "@/lib/rules";

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
};

export default function ExcelGrid({ rows, rule, extraColumns = [] }: Props) {
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

    const toColDef = (field: string, header: string, pinnedFirst: boolean): ColDef => ({
      field,
      headerName: header,
      pinned: pinnedFirst ? "left" : undefined,
      resizable: true,
      sortable: true,
      filter: true,
      minWidth: 90,
      comparator: (a, b) => compareValues(a, b),
      valueFormatter: (params) => (params.value === null || params.value === undefined ? "" : String(params.value)),
    });

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
  }, [rule, extraColumns]);

  const defaultColDef = useMemo<ColDef>(
    () => ({
      resizable: true,
      sortable: true,
      filter: true,
      minWidth: 80,
    }),
    []
  );

  return (
    <div className="ag-theme-quartz excel-grid" style={{ width: "100%", height: "100%" }}>
      <AgGridReact
        theme="legacy"
        rowData={rows}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        rowSelection={{ mode: "singleRow" }}
        animateRows
      />
    </div>
  );
}
