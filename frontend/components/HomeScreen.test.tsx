import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import HomeScreen from "./HomeScreen";
import { convertText, convertFile, type ConvertResponse } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  convertText: vi.fn(),
  convertFile: vi.fn(),
}));

const RESPONSE: ConvertResponse = {
  filename: "converted.xlsx",
  columns: ["PPID", "TS#"],
  rows: [{ PPID: "X1", "TS#": "TS#1" }],
  total_rows: 1,
  summary: { ppid_count: 1, ts_count: 1, generated_rows: 1, conversion_time_seconds: 0.1 },
  debug: null,
};

describe("HomeScreen", () => {
  beforeEach(() => {
    vi.mocked(convertText).mockReset();
    vi.mocked(convertFile).mockReset();
  });

  it("disables Convert when there is no file or pasted text", () => {
    render(<HomeScreen onConverted={vi.fn()} debugMode={false} />);
    expect(screen.getByRole("button", { name: /convert/i })).toBeDisabled();
  });

  it("enables Convert once text is pasted", () => {
    render(<HomeScreen onConverted={vi.fn()} debugMode={false} />);
    fireEvent.change(screen.getByPlaceholderText(/paste excel data/i), {
      target: { value: "PPID\tParameter\tValue\nX1\tPPID\tX1" },
    });
    expect(screen.getByRole("button", { name: /convert/i })).not.toBeDisabled();
  });

  it("converts pasted text and reports the result via onConverted", async () => {
    vi.mocked(convertText).mockResolvedValue(RESPONSE);
    const onConverted = vi.fn();
    render(<HomeScreen onConverted={onConverted} debugMode={false} />);

    fireEvent.change(screen.getByPlaceholderText(/paste excel data/i), {
      target: { value: "PPID\tParameter\tValue\nX1\tPPID\tX1" },
    });
    fireEvent.click(screen.getByRole("button", { name: /convert/i }));

    await waitFor(() => expect(onConverted).toHaveBeenCalledWith(RESPONSE));
    expect(convertText).toHaveBeenCalledWith(
      "PPID\tParameter\tValue\nX1\tPPID\tX1",
      false,
      expect.any(AbortSignal)
    );
    expect(convertFile).not.toHaveBeenCalled();
  });

  it("shows an error and does not call onConverted when conversion fails", async () => {
    vi.mocked(convertText).mockRejectedValue(new Error("Conversion failed (400)"));
    const onConverted = vi.fn();
    render(<HomeScreen onConverted={onConverted} debugMode={false} />);

    fireEvent.change(screen.getByPlaceholderText(/paste excel data/i), {
      target: { value: "bad data" },
    });
    fireEvent.click(screen.getByRole("button", { name: /convert/i }));

    expect(await screen.findByText("Conversion failed (400)")).toBeInTheDocument();
    expect(onConverted).not.toHaveBeenCalled();
  });
});
