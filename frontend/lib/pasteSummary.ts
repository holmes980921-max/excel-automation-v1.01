/**
 * Lightweight summary of pasted clipboard text (V1.08 performance fix).
 *
 * Pasting ~200,000+ rows directly into a controlled, auto-sizing textarea
 * froze the browser (MUI's multiline TextField has no height cap by
 * default, so it tried to lay out a textarea tall enough to show every
 * line). The fix: never let pasted text reach the DOM/controlled value at
 * all - HomeScreen intercepts the paste event, summarizes it here (a single
 * fast pass, no rendering), and shows only this summary. The full text is
 * kept in a ref for Convert to use, never in rendered state.
 */

export type PasteSummary = {
  rows: number;
  columns: number;
};

/** Mirrors parse_pasted_text's shape (backend/app/utils/excel_io.py): first
 * line is a header (not counted as a row), tab-separated columns, blank
 * body lines skipped - close enough for an informational summary without
 * needing to duplicate the backend's full parsing logic. */
export function summarizePastedText(text: string): PasteSummary {
  if (!text) return { rows: 0, columns: 0 };

  const lines = text.split("\n");
  const headerLine = lines[0] ?? "";
  const columns = headerLine.trim() === "" ? 0 : headerLine.split("\t").length;
  const rows = lines.slice(1).reduce((count, line) => (line.trim() === "" ? count : count + 1), 0);

  return { rows, columns };
}
