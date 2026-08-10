import { describe, it, expect } from "vitest";
import { isValidCssColor, normalizeToHex, pickContrastingTextColor } from "./cssColor";

describe("normalizeToHex / isValidCssColor", () => {
  it("accepts a 6-digit hex color", () => {
    expect(normalizeToHex("#8E44AD")).toBe("#8e44ad");
    expect(isValidCssColor("#8E44AD")).toBe(true);
  });

  it("accepts and expands a 3-digit hex color", () => {
    expect(normalizeToHex("#abc")).toBe("#aabbcc");
  });

  it("accepts a standard CSS color name, case-insensitively", () => {
    expect(normalizeToHex("purple")).toBe("#800080");
    expect(normalizeToHex("Purple")).toBe("#800080");
    expect(isValidCssColor("purple")).toBe(true);
  });

  it("rejects an invalid color string", () => {
    expect(normalizeToHex("INVALID_COLOR")).toBeNull();
    expect(isValidCssColor("INVALID_COLOR")).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(isValidCssColor("")).toBe(false);
  });
});

describe("pickContrastingTextColor", () => {
  it("picks white text for a dark background", () => {
    expect(pickContrastingTextColor("#34495E")).toBe("#ffffff"); // Si's dark slate color
    expect(pickContrastingTextColor("black")).toBe("#ffffff");
  });

  it("picks black text for a light background", () => {
    expect(pickContrastingTextColor("#F4D03F")).toBe("#000000"); // A's light yellow color
    expect(pickContrastingTextColor("white")).toBe("#000000");
  });

  it("falls back to black text for an unresolvable color rather than throwing", () => {
    expect(pickContrastingTextColor("not-a-color")).toBe("#000000");
  });
});
