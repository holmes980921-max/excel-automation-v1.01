"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { compareValues } from "@/lib/naturalCompare";

type SortDirection = "asc" | "desc";
type SortState = { column: string | null; direction: SortDirection | null };

const DEFAULT_COLUMN_WIDTH = 150;
const MIN_COLUMN_WIDTH = 60;

type Props = {
  columns: string[];
  rows: Record<string, unknown>[];
};

function cellText(value: unknown): string {
  return value === null || value === undefined ? "" : String(value);
}

export default function PreviewTable({ columns, rows }: Props) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortState, setSortState] = useState<SortState>({ column: null, direction: null });
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});

  const resizeRef = useRef<{ column: string; startX: number; startWidth: number } | null>(null);

  const filteredRows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) => columns.some((col) => cellText(row[col]).toLowerCase().includes(term)));
  }, [rows, columns, searchTerm]);

  const displayedRows = useMemo(() => {
    const { column, direction } = sortState;
    if (!column || !direction) return filteredRows;
    const factor = direction === "asc" ? 1 : -1;
    return [...filteredRows].sort((a, b) => compareValues(a[column], b[column]) * factor);
  }, [filteredRows, sortState]);

  const handleHeaderClick = useCallback((col: string) => {
    setSortState((prev) => {
      if (prev.column !== col) return { column: col, direction: "asc" };
      if (prev.direction === "asc") return { column: col, direction: "desc" };
      return { column: null, direction: null };
    });
  }, []);

  const handleResizeStart = useCallback(
    (col: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const startWidth = columnWidths[col] ?? DEFAULT_COLUMN_WIDTH;
      resizeRef.current = { column: col, startX: e.clientX, startWidth };

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const active = resizeRef.current;
        if (!active) return;
        const delta = moveEvent.clientX - active.startX;
        const nextWidth = Math.max(MIN_COLUMN_WIDTH, active.startWidth + delta);
        setColumnWidths((prev) => ({ ...prev, [active.column]: nextWidth }));
      };

      const handleMouseUp = () => {
        resizeRef.current = null;
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    },
    [columnWidths]
  );

  return (
    <div>
      <div className="search-bar">
        <input
          type="text"
          className="search-input"
          placeholder="Search all columns..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <button type="button" className="search-clear" onClick={() => setSearchTerm("")} aria-label="Clear search">
            ✕
          </button>
        )}
        <span className="search-count">
          Showing {displayedRows.length} of {rows.length} rows
        </span>
      </div>

      <div className="table-wrap">
        <table style={{ tableLayout: "fixed" }}>
          <colgroup>
            {columns.map((col) => (
              <col key={col} style={{ width: columnWidths[col] ?? DEFAULT_COLUMN_WIDTH }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {columns.map((col) => {
                const isSorted = sortState.column === col;
                const indicator = isSorted ? (sortState.direction === "asc" ? " ▲" : " ▼") : "";
                return (
                  <th key={col} className="sortable-th" onClick={() => handleHeaderClick(col)}>
                    <span className="th-label">
                      {col}
                      {indicator}
                    </span>
                    <span
                      className="resize-handle"
                      onMouseDown={(e) => handleResizeStart(col, e)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {displayedRows.map((row, i) => (
              <tr key={i}>
                {columns.map((col) => (
                  <td key={col}>{cellText(row[col])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
