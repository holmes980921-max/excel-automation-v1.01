import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import {
  InvalidExcelFormatError,
  detectExcelFormat,
  looksLikeHtml,
  parsePastedTable,
  parsePastedText,
  readDescriptionFile,
  readRawRows,
  resolveDescriptionRows,
  rowsToXlsxBlob,
  toNumberIfNumeric,
} from "./excelIO";

// Mirrors backend/tests/test_excel_io.py (+ conftest.py's SAMPLE_ROWS).

const SAMPLE_ROWS = [
  ["PPID", "Parameter", "REF.xxx"],
  ["AB000010_1", "PPID", "AB000010_1"],
  ["AB000010_1", "TS#1_FilmMaterial", "GASLKEJQLWKEJ"],
  ["AB000010_1", "TS#1_CardName", "CARD1"],
  ["AB000010_1", "TS#2_FilmMaterial", "FILM2"],
  ["AB000020_1", "PPID", "AB000020_1"],
  ["AB000020_1", "TS#1_CardName", "CARDX"],
];

function buildXlsxBytes(rows: unknown[][]): Uint8Array {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  return new Uint8Array(XLSX.write(wb, { bookType: "xlsx", type: "array" }));
}

function buildHtmlMasqueradingAsXls(rows: unknown[][]): Uint8Array {
  const rowsHtml = rows
    .map((row) => "<tr>" + row.map((cell) => `<td>${cell}</td>`).join("") + "</tr>")
    .join("");
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office"><head><meta charset="utf-8"></head><body><table border=1>${rowsHtml}</table></body></html>`;
  return new TextEncoder().encode(html);
}

describe("detectExcelFormat", () => {
  it("detects a real .xlsx by its ZIP signature", () => {
    expect(detectExcelFormat(buildXlsxBytes(SAMPLE_ROWS))).toBe("xlsx");
  });

  it("rejects garbage bytes", () => {
    expect(() => detectExcelFormat(new TextEncoder().encode("not an excel file at all"))).toThrow(
      InvalidExcelFormatError
    );
  });

  it("sets .name explicitly so worker.ts can identify it across the postMessage boundary (V1.11)", () => {
    try {
      detectExcelFormat(new TextEncoder().encode("not an excel file at all"));
      expect.unreachable("expected detectExcelFormat to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
      expect((err as Error).name).toBe("InvalidExcelFormatError");
    }
  });
});

describe("looksLikeHtml", () => {
  it("is true for an HTML table masquerading as .xls", () => {
    expect(looksLikeHtml(buildHtmlMasqueradingAsXls(SAMPLE_ROWS))).toBe(true);
  });

  it("is false for a real .xlsx", () => {
    expect(looksLikeHtml(buildXlsxBytes(SAMPLE_ROWS))).toBe(false);
  });
});

describe("readRawRows", () => {
  it("reads a real .xlsx", () => {
    const rows = readRawRows(buildXlsxBytes(SAMPLE_ROWS));
    expect(rows).toContainEqual(["AB000010_1", "TS#1_CardName", "CARD1"]);
  });

  it("reads an HTML table masquerading as .xls (V1.04.1 regression)", () => {
    const rows = readRawRows(buildHtmlMasqueradingAsXls(SAMPLE_ROWS));
    expect(rows).toContainEqual(["AB000010_1", "TS#1_CardName", "CARD1"]);
  });

  it("raises a clean error for HTML with no table", () => {
    const html = new TextEncoder().encode("<html><body><p>no table here</p></body></html>");
    expect(() => readRawRows(html)).toThrow(InvalidExcelFormatError);
  });

  it("ignores extra columns beyond PPID/Parameter/Reference Value", () => {
    const rows = readRawRows(
      buildXlsxBytes([
        ["PPID", "Parameter", "REF.xxx", "Operator", "Comment"],
        ["X1", "PPID", "X1", "op_a", "note"],
        ["X1", "TS#1_CardName", "CARD_X", "op_a", "note"],
      ])
    );
    expect(rows).toEqual([
      ["X1", "PPID", "X1"],
      ["X1", "TS#1_CardName", "CARD_X"],
    ]);
  });
});

describe("readDescriptionFile", () => {
  it("resolves PPID/DESC columns by name", () => {
    const rows = readDescriptionFile(
      buildXlsxBytes([
        ["PPID", "DESC"],
        ["AB000010_1", "First PPID"],
        ["AB000020_1", "Second PPID"],
      ])
    );
    expect(rows).toEqual([
      { PPID: "AB000010_1", DESC: "First PPID" },
      { PPID: "AB000020_1", DESC: "Second PPID" },
    ]);
  });

  it("accepts 'Description' as a header alias for DESC", () => {
    const rows = readDescriptionFile(
      buildXlsxBytes([
        ["PPID", "Description"],
        ["AB000010_1", "First PPID"],
      ])
    );
    expect(rows).toEqual([{ PPID: "AB000010_1", DESC: "First PPID" }]);
  });

  it("rejects a file missing the DESC column", () => {
    expect(() =>
      readDescriptionFile(
        buildXlsxBytes([
          ["PPID", "Notes"],
          ["AB000010_1", "irrelevant"],
        ])
      )
    ).toThrow(/DESC/);
  });
});

describe("parsePastedText", () => {
  it("parses tab-separated pasted text, skipping the header row", () => {
    const rows = parsePastedText("PPID\tParameter\tValue\nX1\tPPID\tX1\nX1\tTS#1_CardName\t5");
    expect(rows).toEqual([
      ["X1", "PPID", "X1"],
      ["X1", "TS#1_CardName", 5],
    ]);
  });

  it("rejects empty pasted text", () => {
    expect(() => parsePastedText("")).toThrow(InvalidExcelFormatError);
  });
});

describe("parsePastedTable / resolveDescriptionRows (Add Description paste, V1.10)", () => {
  it("parses a pasted PPID/DESC table identically to a file upload", () => {
    const rows = parsePastedTable("PPID\tDESC\nAB000010_1\tFirst PPID\nAB000020_1\tSecond PPID");
    const resolved = resolveDescriptionRows(rows);
    expect(resolved).toEqual([
      { PPID: "AB000010_1", DESC: "First PPID" },
      { PPID: "AB000020_1", DESC: "Second PPID" },
    ]);
  });
});

describe("toNumberIfNumeric", () => {
  it("converts integer-looking strings to numbers", () => {
    expect(toNumberIfNumeric("42")).toBe(42);
  });

  it("converts float-looking strings to numbers", () => {
    expect(toNumberIfNumeric("3.14")).toBeCloseTo(3.14);
  });

  it("leaves non-numeric strings untouched", () => {
    expect(toNumberIfNumeric("CARD1")).toBe("CARD1");
  });

  it("treats a blank string as null", () => {
    expect(toNumberIfNumeric("  ")).toBeNull();
  });
});

describe("rowsToXlsxBlob", () => {
  it("round-trips header + rows through a real .xlsx write/read", async () => {
    const blob = rowsToXlsxBlob(["PPID", "TS#"], [["X1", "TS#1"], ["X2", "TS#1"]]);
    const buf = new Uint8Array(await blob.arrayBuffer());
    const rows = readRawRowsForTest(buf);
    expect(rows[0]).toEqual(["PPID", "TS#"]);
    expect(rows[1]).toEqual(["X1", "TS#1"]);
  });
});

function readRawRowsForTest(bytes: Uint8Array): unknown[][] {
  const wb = XLSX.read(bytes, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 });
}
