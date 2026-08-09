import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import {
  addDescriptionFromClipboard,
  addDescriptionFromFile,
  convertFile,
  convertText,
  exportRows,
  InvalidExcelFormatError,
} from "./engine";
import { DEFAULT_RULE, type TransformationRule } from "@/lib/rules";

function buildXlsxBytes(rows: unknown[][]): Uint8Array {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  return new Uint8Array(XLSX.write(wb, { bookType: "xlsx", type: "array" }));
}

const SAMPLE_SHEET = [
  ["PPID", "Parameter", "REF.xxx"],
  ["AB000010_1", "PPID", "AB000010_1"],
  ["AB000010_1", "TS#1_CardName", "CARD1"],
  ["AB000020_1", "PPID", "AB000020_1"],
  ["AB000020_1", "TS#1_CardName", "CARDX"],
];

describe("convertFile", () => {
  it("converts a real .xlsx into the ConvertResponse shape", () => {
    const result = convertFile(buildXlsxBytes(SAMPLE_SHEET), "input.xlsx");
    expect(result.filename).toBe("input_converted.xlsx");
    expect(result.total_rows).toBe(2);
    expect(result.summary.ppid_count).toBe(2);
    expect(result.rows.map((r) => r.PPID).sort()).toEqual(["AB000010_1", "AB000020_1"]);
    expect(result.debug).toBeNull();
  });

  it("populates debug info only when requested", () => {
    const result = convertFile(buildXlsxBytes(SAMPLE_SHEET), "input.xlsx", true);
    expect(result.debug).not.toBeNull();
    expect(result.debug!.engine_used).toBe("xlsx");
  });

  it("raises a clean error when no TS# data is found", () => {
    expect(() => convertFile(buildXlsxBytes([["PPID", "Parameter", "REF.xxx"]]), "empty.xlsx")).toThrow(
      InvalidExcelFormatError
    );
  });
});

describe("convertText", () => {
  it("converts pasted TSV text", () => {
    const result = convertText("PPID\tParameter\tValue\nX1\tPPID\tX1\nX1\tTS#1_CardName\tCARD_X");
    expect(result.total_rows).toBe(1);
    expect(result.rows[0].PPID).toBe("X1");
    expect(result.filename).toBe("pasted_converted.xlsx");
  });

  it("rejects empty pasted text", () => {
    expect(() => convertText("   ")).toThrow(InvalidExcelFormatError);
  });
});

describe("exportRows", () => {
  const rows = [
    { PPID: "X1", "TS#": "TS#1", CardName: "C1", FilmMaterial: "F1", CorrelationCard_1: "-", CorrelationCard_2: "-", CorrelationCard_3: "-", DataCombination: "-", DataFeedFoward: "-" },
  ];

  it("shapes rows per the Default rule and writes a real .xlsx", async () => {
    const { filename, blob } = exportRows("out.xlsx", rows, DEFAULT_RULE);
    expect(filename).toBe("out.xlsx");
    const buf = new Uint8Array(await blob.arrayBuffer());
    const wb = XLSX.read(buf, { type: "array" });
    const sheetRows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[wb.SheetNames[0]], { header: 1 });
    expect(sheetRows[0]).toContain("PPID");
  });

  it("appends .xlsx to a filename that doesn't already have it", () => {
    const { filename } = exportRows("out", rows, DEFAULT_RULE);
    expect(filename).toBe("out.xlsx");
  });

  it("inserts DESC immediately after PPID regardless of rule column order", () => {
    const rule: TransformationRule = {
      id: "reorder",
      rule_name: "Reorder",
      output_columns: ["PPID", "TS#", "CardName"],
      column_order: ["CardName", "PPID", "TS#"],
      aliases: {},
    };
    const rowsWithDesc = [{ ...rows[0], DESC: "hello" }];
    const { blob } = exportRows("out.xlsx", rowsWithDesc, rule);
    return blob.arrayBuffer().then((buf) => {
      const wb = XLSX.read(new Uint8Array(buf), { type: "array" });
      const sheetRows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[wb.SheetNames[0]], { header: 1 });
      expect(sheetRows[0]).toEqual(["CardName", "PPID", "DESC", "TS#"]);
    });
  });

  it("throws when there are no rows to export", () => {
    expect(() => exportRows("out.xlsx", [], DEFAULT_RULE)).toThrow(InvalidExcelFormatError);
  });
});

describe("addDescriptionFromFile", () => {
  const baseRows = [
    { PPID: "AB000010_1", "TS#": "TS#1", CardName: "CARD1" },
    { PPID: "AB000020_1", "TS#": "TS#1", CardName: "CARDX" },
  ];

  it("merges DESC from an uploaded file", () => {
    const descBytes = buildXlsxBytes([
      ["PPID", "DESC"],
      ["AB000010_1", "First PPID"],
    ]);
    const result = addDescriptionFromFile(descBytes, baseRows);
    expect(result.rows.map((r) => r.DESC)).toEqual(["First PPID", "-"]);
    expect(result.matched_count).toBe(1);
    expect(result.unmatched_count).toBe(1);
  });
});

describe("addDescriptionFromClipboard (V1.10)", () => {
  const baseRows = [
    { PPID: "AB000010_1", "TS#": "TS#1", CardName: "CARD1" },
    { PPID: "AB000020_1", "TS#": "TS#1", CardName: "CARDX" },
  ];

  it("merges DESC pasted as plain TSV text, identically to a file upload", () => {
    const result = addDescriptionFromClipboard(
      { text: "PPID\tDESC\nAB000010_1\tFirst PPID\nAB000020_1\tSecond PPID" },
      baseRows
    );
    expect(result.rows.map((r) => r.DESC)).toEqual(["First PPID", "Second PPID"]);
    expect(result.matched_count).toBe(2);
  });

  it("merges DESC pasted as an HTML table (Excel's clipboard format)", () => {
    const html =
      "<html><body><table><tr><td>PPID</td><td>DESC</td></tr>" +
      "<tr><td>AB000010_1</td><td>First PPID</td></tr>" +
      "<tr><td>AB000020_1</td><td>Second PPID</td></tr></table></body></html>";
    const result = addDescriptionFromClipboard({ html }, baseRows);
    expect(result.rows.map((r) => r.DESC)).toEqual(["First PPID", "Second PPID"]);
    expect(result.matched_count).toBe(2);
  });

  it("produces the same merge result across text and HTML clipboard payloads for the same data", () => {
    const html =
      "<html><body><table><tr><td>PPID</td><td>DESC</td></tr>" +
      "<tr><td>AB000010_1</td><td>First PPID</td></tr></table></body></html>";
    const fromHtml = addDescriptionFromClipboard({ html }, baseRows);
    const fromText = addDescriptionFromClipboard({ text: "PPID\tDESC\nAB000010_1\tFirst PPID" }, baseRows);
    expect(fromHtml.rows).toEqual(fromText.rows);
    expect(fromHtml.matched_count).toBe(fromText.matched_count);
  });
});
