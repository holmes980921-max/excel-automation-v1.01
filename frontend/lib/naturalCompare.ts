/**
 * Natural-order comparator: splits each value into runs of digits vs.
 * non-digits and compares digit runs numerically, so "TS#2" sorts before
 * "TS#10" (unlike plain string comparison, which would put "TS#10" first).
 * Works uniformly for every column - PPID, TS#, and free-text/numeric fields.
 */
export function naturalCompare(a: string, b: string): number {
  const chunk = (s: string): string[] => s.match(/(\d+|\D+)/g) ?? [];
  const chunksA = chunk(a);
  const chunksB = chunk(b);
  const len = Math.max(chunksA.length, chunksB.length);

  for (let i = 0; i < len; i++) {
    const x = chunksA[i] ?? "";
    const y = chunksB[i] ?? "";
    if (x === y) continue;

    const isNumX = /^\d+$/.test(x);
    const isNumY = /^\d+$/.test(y);
    if (isNumX && isNumY) {
      const diff = Number(x) - Number(y);
      if (diff !== 0) return diff;
    } else {
      const cmp = x.localeCompare(y, undefined, { sensitivity: "base" });
      if (cmp !== 0) return cmp;
    }
  }
  return 0;
}

export function compareValues(a: unknown, b: unknown): number {
  const asString = (v: unknown) => (v === null || v === undefined ? "" : String(v));
  return naturalCompare(asString(a), asString(b));
}
