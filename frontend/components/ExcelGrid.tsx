"use client";

import { useMemo, useRef } from "react";
import { AgGridReact } from "ag-grid-react";
import {
  ModuleRegistry,
  AllCommunityModule,
  type ColDef,
  type GridApi,
  type GridReadyEvent,
} from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";
import { compareValues } from "@/lib/naturalCompare";
import { resolveDisplayColumns, type TransformationRule } from "@/lib/rules";

ModuleRegistry.registerModules([AllCommunityModule]);

type Props = {
  rows: Record<string, unknown>[];
  rule: TransformationRule;
  quickFilterText: string;
  onDisplayedRowCountChange?: (count: number) => void;
};

export default function ExcelGrid({ rows, rule, quickFilterText, onDisplayedRowCountChange }: Props) {
  const gridApiRef = useRef<GridApi | null>(null);

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

    const dataCols: ColDef[] = displayColumns.map(({ field, header }, index) => ({
      field,
      headerName: header,
      pinned: index === 0 ? "left" : undefined,
      resizable: true,
      sortable: true,
      filter: true,
      minWidth: 90,
      comparator: (a, b) => compareValues(a, b),
      valueFormatter: (params) => (params.value === null || params.value === undefined ? "" : String(params.value)),
    }));

    return [rowNumberCol, ...dataCols];
  }, [rule]);

  const defaultColDef = useMemo<ColDef>(
    () => ({
      resizable: true,
      sortable: true,
      filter: true,
      minWidth: 80,
    }),
    []
  );

  const handleGridReady = (event: GridReadyEvent) => {
    gridApiRef.current = event.api;
    onDisplayedRowCountChange?.(event.api.getDisplayedRowCount());
  };

  const handleModelUpdated = () => {
    if (gridApiRef.current) {
      onDisplayedRowCountChange?.(gridApiRef.current.getDisplayedRowCount());
    }
  };

  return (
    <div className="ag-theme-quartz excel-grid" style={{ width: "100%", height: "100%" }}>
      <AgGridReact
        theme="legacy"
        rowData={rows}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        quickFilterText={quickFilterText}
        rowSelection={{ mode: "singleRow" }}
        animateRows
        onGridReady={handleGridReady}
        onModelUpdated={handleModelUpdated}
      />
    </div>
  );
}
