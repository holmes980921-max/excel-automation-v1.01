/**
 * V1.14: special Value post-processing for exactly two TS#-matched fields
 * (`PreProcess`, `ReferenceTestPathName`) - RCC's raw values for these can
 * look like a backslash-delimited path (`%%%%\%%\%%%%\QWEDWQASJ_2`); only
 * the text after the last `\` is meaningful to a human reading the
 * Converted Excel. This does not touch TS# matching itself (see
 * transformer.ts's generic `OUTPUT_COLUMNS` loop) - it only post-processes
 * the value once the correct TS#N_<field> has already been found.
 */

export const LAST_SEGMENT_FIELDS = new Set(["PreProcess", "ReferenceTestPathName"]);

/**
 * Returns the substring after the last `\` in a string value, or the value
 * unchanged if it isn't a string or contains no `\` at all. Non-string
 * values (e.g. a raw cell that happens to be a number) and edge-case
 * strings (a trailing `\`, consecutive `\\`) are all handled without
 * throwing - per spec, these patterns aren't expected in real RCC data and
 * don't need dedicated business logic, but the extraction itself must never
 * raise on an ordinary string.
 */
export function extractLastPathSegment(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const lastBackslash = value.lastIndexOf("\\");
  return lastBackslash === -1 ? value : value.slice(lastBackslash + 1);
}
