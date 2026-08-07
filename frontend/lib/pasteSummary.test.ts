import { describe, it, expect } from "vitest";
import { summarizePastedText } from "./pasteSummary";

describe("summarizePastedText", () => {
  it("returns zero rows/columns for empty input", () => {
    expect(summarizePastedText("")).toEqual({ rows: 0, columns: 0 });
  });

  it("counts the header row's tab-separated columns without counting it as a row", () => {
    const text = "PPID\tParameter\tValue\nX1\tPPID\tX1\nX1\tTS#1_CardName\tCARD1";
    expect(summarizePastedText(text)).toEqual({ rows: 2, columns: 3 });
  });

  it("skips blank body lines when counting rows", () => {
    const text = "PPID\tParameter\tValue\nX1\tPPID\tX1\n\n\nX1\tTS#1_CardName\tCARD1\n";
    expect(summarizePastedText(text)).toEqual({ rows: 2, columns: 3 });
  });

  it("handles a header-only paste as zero rows", () => {
    expect(summarizePastedText("PPID\tParameter\tValue")).toEqual({ rows: 0, columns: 3 });
  });

  it("stays fast on a very large paste (200k+ rows)", () => {
    const header = "PPID\tParameter\tValue";
    const lines = [header];
    for (let i = 0; i < 200_000; i++) {
      lines.push(`PPID${i}\tTS#1_CardName\tCARD${i}`);
    }
    const text = lines.join("\n");

    const start = performance.now();
    const summary = summarizePastedText(text);
    const elapsedMs = performance.now() - start;

    expect(summary).toEqual({ rows: 200_000, columns: 3 });
    // Generous ceiling for CI/CPU variance - the point is "doesn't hang the
    // main thread," not squeezing out the last millisecond.
    expect(elapsedMs).toBeLessThan(1000);
  });
});
