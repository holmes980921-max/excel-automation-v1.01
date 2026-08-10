import { describe, it, expect, vi, afterEach } from "vitest";
import { parseMaterialDbCsv, loadMaterialDb, __resetMaterialDbCacheForTests } from "./materialDb";

const MOCK_CSV = ["Material Code,Color", "A,#F4D03F", "B,#8E44AD", "C,#5DADE2", "D,#E67E22", "AB,#2ECC71", "Si,#34495E"].join(
  "\n"
);

describe("parseMaterialDbCsv", () => {
  it("parses a valid CSV into entries, longest codes first", () => {
    const result = parseMaterialDbCsv(MOCK_CSV);
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.entries.get("A")).toBe("#F4D03F");
    expect(result.entries.get("AB")).toBe("#2ECC71");
    expect(result.entries.size).toBe(6);
    expect(result.codesLongestFirst[0]).toBe("AB"); // the only 2-char code, must sort before every 1-char code
  });

  it("accepts a CSS color name alongside hex colors", () => {
    const result = parseMaterialDbCsv("Material Code,Color\nA,purple\nB,#123456");
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.entries.get("A")).toBe("purple");
  });

  it("allows duplicate colors across different Material Codes (not an error)", () => {
    const result = parseMaterialDbCsv("Material Code,Color\nA,purple\nB,purple");
    expect(result.status).toBe("ok");
  });

  it("rejects a duplicate Material Code", () => {
    const result = parseMaterialDbCsv("Material Code,Color\nA,#F4D03F\nA,#FF0000");
    expect(result.status).toBe("invalid");
    if (result.status !== "invalid") return;
    expect(result.message).toMatch(/Duplicate Material Code: A/);
  });

  it("rejects an invalid color", () => {
    const result = parseMaterialDbCsv("Material Code,Color\nSi,INVALID_COLOR");
    expect(result.status).toBe("invalid");
    if (result.status !== "invalid") return;
    expect(result.message).toMatch(/Invalid color for Material Code: Si/);
  });

  it("treats an empty file as a load error, not a validation error", () => {
    expect(parseMaterialDbCsv("").status).toBe("load-error");
  });

  it("treats a malformed row (wrong column count) as a load error", () => {
    const result = parseMaterialDbCsv("Material Code,Color\nA,#F4D03F,extra");
    expect(result.status).toBe("load-error");
  });

  it("treats an unexpected header as a load error", () => {
    const result = parseMaterialDbCsv("Code,Colour\nA,#F4D03F");
    expect(result.status).toBe("load-error");
  });
});

describe("loadMaterialDb", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    __resetMaterialDbCacheForTests();
  });

  it("fetches and parses the CSV from /data/material-db.csv", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve(MOCK_CSV) });
    vi.stubGlobal("fetch", fetchMock);

    const result = await loadMaterialDb();

    expect(result.status).toBe("ok");
    expect(fetchMock).toHaveBeenCalledWith("/data/material-db.csv");
  });

  it("caches the result - a second call does not fetch again", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve(MOCK_CSV) });
    vi.stubGlobal("fetch", fetchMock);

    await loadMaterialDb();
    await loadMaterialDb();

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("reports a load-error when the file is missing (404)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    const result = await loadMaterialDb();
    expect(result.status).toBe("load-error");
  });

  it("reports a load-error when fetch itself throws (network failure)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    const result = await loadMaterialDb();
    expect(result.status).toBe("load-error");
  });
});
