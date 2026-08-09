/**
 * Column-order helpers - TS port of backend/app/utils/df_helpers.py
 * (V1.10 Browser Edition).
 *
 * The Python version operates on a pandas DataFrame's column index and
 * physically inserts a Series at a position. Row objects in JS don't have
 * that positional constraint (a key can be read regardless of insertion
 * order), so only the *column order list* needs the same "insert right
 * after an anchor, or append at the end" logic - used to decide export
 * column order and where DESC is placed in the grid/export, matching
 * "Preview = Export" (V1.07).
 */

export function findInsertPosition(columns: string[], after: string): number {
  const idx = columns.indexOf(after);
  return idx === -1 ? columns.length : idx + 1;
}

export function insertFieldAfter(columns: string[], field: string, after: string): string[] {
  const result = [...columns];
  result.splice(findInsertPosition(columns, after), 0, field);
  return result;
}
