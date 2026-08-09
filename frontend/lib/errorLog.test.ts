import { describe, it, expect } from "vitest";
import { buildErrorLogEntry, formatErrorLog, toError } from "./errorLog";

describe("buildErrorLogEntry", () => {
  it("captures the error message and stack", () => {
    const error = new Error("boom");
    const entry = buildErrorLogEntry({ error, operation: "UI Rendering" });

    expect(entry.message).toBe("boom");
    expect(entry.operation).toBe("UI Rendering");
    expect(entry.stack).toContain("boom");
    expect(entry.appVersion).toMatch(/^\d+\.\d+\.\d+ \(v\d+\.\d+\)$/);
    expect(new Date(entry.timestamp).toString()).not.toBe("Invalid Date");
  });

  it("appends the React component stack when provided", () => {
    const error = new Error("boom");
    const entry = buildErrorLogEntry({
      error,
      operation: "UI Rendering",
      componentStack: "\n    in ExcelGrid\n    in Home",
    });

    expect(entry.stack).toContain("Component stack:");
    expect(entry.stack).toContain("in ExcelGrid");
  });

  it("falls back to a placeholder for an error with no message", () => {
    const entry = buildErrorLogEntry({ error: new Error(), operation: "UI Rendering" });
    expect(entry.message).toBe("(no message)");
  });
});

describe("toError", () => {
  it("passes a real Error through unchanged", () => {
    const original = new Error("boom");
    expect(toError(original, "fallback")).toBe(original);
  });

  it("wraps a non-Error thrown value in a real Error using the fallback message", () => {
    const wrapped = toError("a string was thrown", "fallback message");
    expect(wrapped).toBeInstanceOf(Error);
    expect(wrapped.message).toBe("fallback message");
  });
});

describe("formatErrorLog", () => {
  it("renders every field as a labeled line, easy to copy as-is", () => {
    const entry = buildErrorLogEntry({ error: new Error("boom"), operation: "UI Rendering" });
    const text = formatErrorLog(entry);

    expect(text).toContain("Timestamp:");
    expect(text).toContain("Application Version:");
    expect(text).toContain("Operation: UI Rendering");
    expect(text).toContain("Error Message: boom");
    expect(text).toContain("Environment:");
    expect(text).toContain("Stack Trace:");
  });

  it("never includes application data - only what buildErrorLogEntry produced", () => {
    const entry = buildErrorLogEntry({ error: new Error("boom"), operation: "UI Rendering" });
    const text = formatErrorLog(entry);
    // Sanity check against accidental leakage of a hypothetical PPID value -
    // nothing in the builder ever reads application state, but this pins
    // the contract down as a regression guard.
    expect(text).not.toMatch(/PPID|TS#\d/);
  });
});
