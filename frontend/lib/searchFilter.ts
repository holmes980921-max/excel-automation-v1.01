/**
 * Client-side row search (V1.06 Search).
 *
 * Search always runs against the *entire* converted dataset (never just
 * the currently-previewed slice) so the match count is accurate regardless
 * of the active Preview Rows setting - only how many of those matches are
 * actually rendered is governed by Preview Rows (see app/page.tsx).
 */

export function filterRows(
  rows: Record<string, unknown>[],
  query: string
): Record<string, unknown>[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return rows;

  return rows.filter((row) =>
    Object.values(row).some((value) => {
      if (value === null || value === undefined) return false;
      return String(value).toLowerCase().includes(trimmed);
    })
  );
}
