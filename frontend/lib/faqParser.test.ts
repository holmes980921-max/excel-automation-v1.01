import { describe, it, expect } from "vitest";
import { parseFaq } from "./faqParser";

describe("parseFaq", () => {
  it("splits ## headings into question/answer entries", () => {
    const md = [
      "# Frequently Asked Questions",
      "",
      "## What data should I use?",
      "",
      "Data downloaded from RCC.",
      "",
      "## How do I copy a log?",
      "",
      "Click Copy Log.",
    ].join("\n");

    const entries = parseFaq(md);
    expect(entries).toEqual([
      { question: "What data should I use?", answer: "Data downloaded from RCC." },
      { question: "How do I copy a log?", answer: "Click Copy Log." },
    ]);
  });

  it("preserves multi-line/multi-paragraph answers", () => {
    const md = ["## Question one", "", "Line one.", "Line two.", "", "Line three."].join("\n");
    const entries = parseFaq(md);
    expect(entries).toHaveLength(1);
    expect(entries[0].answer).toBe("Line one.\nLine two.\n\nLine three.");
  });

  it("returns an empty list for content with no ## headings", () => {
    expect(parseFaq("# Title\n\nJust text.")).toEqual([]);
  });
});
