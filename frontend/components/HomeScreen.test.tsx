import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import HomeScreen from "./HomeScreen";
import { convertText, ApiError, type ConvertResponse } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  convertText: vi.fn(),
  ApiError: class ApiError extends Error {
    isValidationError: boolean;
    constructor(message: string, isValidationError = false) {
      super(message);
      this.isValidationError = isValidationError;
    }
  },
}));

const RESPONSE: ConvertResponse = {
  filename: "converted.xlsx",
  columns: ["PPID", "TS#"],
  rows: [{ PPID: "X1", "TS#": "TS#1" }],
  total_rows: 1,
  summary: { ppid_count: 1, ts_count: 1, generated_rows: 1, conversion_time_seconds: 0.1 },
  debug: null,
};

/** Simulates an actual paste (as opposed to typing) - HomeScreen intercepts
 * this via onPaste, never letting the text reach the controlled textarea
 * value (see lib/pasteSummary.ts / the V1.08 large-dataset fix). */
function pasteInto(element: Element, text: string) {
  fireEvent.paste(element, { clipboardData: { getData: () => text } });
}

function pasteTextarea() {
  return screen.getByPlaceholderText(/paste rcc data here/i);
}

describe("HomeScreen", () => {
  beforeEach(() => {
    vi.mocked(convertText).mockReset();
  });

  it("disables Convert when there is no pasted text", () => {
    render(<HomeScreen onConverted={vi.fn()} debugMode={false} />);
    expect(screen.getByRole("button", { name: /convert/i })).toBeDisabled();
  });

  it("enables Convert once text is typed", () => {
    render(<HomeScreen onConverted={vi.fn()} debugMode={false} />);
    fireEvent.change(pasteTextarea(), {
      target: { value: "PPID\tParameter\tValue\nX1\tPPID\tX1" },
    });
    expect(screen.getByRole("button", { name: /convert/i })).not.toBeDisabled();
  });

  it("converts typed text and reports the result via onConverted", async () => {
    vi.mocked(convertText).mockResolvedValue(RESPONSE);
    const onConverted = vi.fn();
    render(<HomeScreen onConverted={onConverted} debugMode={false} />);

    fireEvent.change(pasteTextarea(), {
      target: { value: "PPID\tParameter\tValue\nX1\tPPID\tX1" },
    });
    fireEvent.click(screen.getByRole("button", { name: /convert/i }));

    await waitFor(() => expect(onConverted).toHaveBeenCalledWith(RESPONSE));
    expect(convertText).toHaveBeenCalledWith(
      "PPID\tParameter\tValue\nX1\tPPID\tX1",
      false,
      expect.any(AbortSignal)
    );
  });

  it("shows an error and does not call onConverted when conversion fails", async () => {
    vi.mocked(convertText).mockRejectedValue(new Error("Conversion failed (400)"));
    const onConverted = vi.fn();
    render(<HomeScreen onConverted={onConverted} debugMode={false} />);

    fireEvent.change(pasteTextarea(), { target: { value: "bad data" } });
    fireEvent.click(screen.getByRole("button", { name: /convert/i }));

    expect(await screen.findByText("Conversion failed (400)")).toBeInTheDocument();
    expect(onConverted).not.toHaveBeenCalled();
  });

  describe("Conversion Input - Clipboard Paste only (V1.13)", () => {
    it("does not render a file upload input", () => {
      const { container } = render(<HomeScreen onConverted={vi.fn()} debugMode={false} />);
      expect(container.querySelector('input[type="file"]')).not.toBeInTheDocument();
    });

    it("does not render any Drag & Drop or Upload/Browse affordance", () => {
      render(<HomeScreen onConverted={vi.fn()} debugMode={false} />);
      expect(screen.queryByText(/drag\s*&\s*drop/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/browse file/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/^upload$/i)).not.toBeInTheDocument();
    });

    it("shows the light/subdued RCC workflow placeholder when the input is empty", () => {
      render(<HomeScreen onConverted={vi.fn()} debugMode={false} />);
      const textarea = pasteTextarea();
      expect(textarea).toHaveAttribute("placeholder", expect.stringContaining("All Export to Excel"));
      expect(textarea).toHaveAttribute("placeholder", expect.stringContaining("EXPORT_ALL_TABLE_%%.xls"));
      expect(textarea).toHaveAttribute("placeholder", expect.stringContaining("Ctrl+A"));
    });

    it("the placeholder disappears once data is pasted (summary replaces the textarea)", () => {
      render(<HomeScreen onConverted={vi.fn()} debugMode={false} />);
      pasteInto(pasteTextarea(), "PPID\tParameter\tValue\nX1\tPPID\tX1");

      expect(screen.queryByPlaceholderText(/paste rcc data here/i)).not.toBeInTheDocument();
      expect(screen.getByText("Clipboard Loaded")).toBeInTheDocument();
    });

    it("Clipboard Paste remains available and drives Convert", async () => {
      vi.mocked(convertText).mockResolvedValue(RESPONSE);
      const onConverted = vi.fn();
      render(<HomeScreen onConverted={onConverted} debugMode={false} />);

      pasteInto(pasteTextarea(), "PPID\tParameter\tValue\nX1\tPPID\tX1\tTS#1_CardName\tCARD1");
      fireEvent.click(screen.getByRole("button", { name: /convert/i }));

      await waitFor(() => expect(onConverted).toHaveBeenCalledWith(RESPONSE));
    });
  });

  describe("Initial screen guidance (V1.13)", () => {
    it("renders the four-step RCC workflow guide with the product-specific names intact", () => {
      render(<HomeScreen onConverted={vi.fn()} debugMode={false} />);

      expect(screen.getByText(/All Export to Excel/)).toBeInTheDocument();
      expect(screen.getByText(/EXPORT_ALL_TABLE_%%\.xls/)).toBeInTheDocument();
      expect(screen.getByText(/Ctrl\+A, then Ctrl\+C/)).toBeInTheDocument();
      expect(screen.getByText(/Paste the data into the web application and click Convert/)).toBeInTheDocument();
    });

    it("does not mention uploading or dragging a file anywhere in the guidance", () => {
      render(<HomeScreen onConverted={vi.fn()} debugMode={false} />);
      expect(screen.queryByText(/upload.*file/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/drag.*drop/i)).not.toBeInTheDocument();
    });
  });

  describe("large paste (V1.08 freeze fix)", () => {
    it("shows a summary instead of rendering the raw pasted text", () => {
      render(<HomeScreen onConverted={vi.fn()} debugMode={false} />);
      const textarea = pasteTextarea();

      const bigText = "PPID\tParameter\tValue\n" + Array.from({ length: 5000 }, (_, i) => `P${i}\tPPID\tP${i}`).join("\n");
      pasteInto(textarea, bigText);

      expect(screen.getByText("Clipboard Loaded")).toBeInTheDocument();
      expect(screen.getByText("Rows: 5,000")).toBeInTheDocument();
      expect(screen.getByText("Columns: 3")).toBeInTheDocument();
      // The raw text must never appear as rendered textarea content.
      expect(screen.queryByPlaceholderText(/paste rcc data here/i)).not.toBeInTheDocument();
      expect(screen.queryByDisplayValue(bigText)).not.toBeInTheDocument();
    });

    it("converts using the full pasted text even though only a summary was rendered", async () => {
      vi.mocked(convertText).mockResolvedValue(RESPONSE);
      const onConverted = vi.fn();
      render(<HomeScreen onConverted={onConverted} debugMode={false} />);

      const bigText = "PPID\tParameter\tValue\nP1\tPPID\tP1\nP1\tTS#1_CardName\tCARD1";
      pasteInto(pasteTextarea(), bigText);
      fireEvent.click(screen.getByRole("button", { name: /convert/i }));

      await waitFor(() => expect(onConverted).toHaveBeenCalledWith(RESPONSE));
      expect(convertText).toHaveBeenCalledWith(bigText, false, expect.any(AbortSignal));
    });

    it("Clear discards the summary and restores the empty paste box", () => {
      render(<HomeScreen onConverted={vi.fn()} debugMode={false} />);
      pasteInto(pasteTextarea(), "PPID\tParameter\tValue\nP1\tPPID\tP1");
      expect(screen.getByText("Clipboard Loaded")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: /clear/i }));

      expect(screen.queryByText("Clipboard Loaded")).not.toBeInTheDocument();
      expect(pasteTextarea()).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /convert/i })).toBeDisabled();
    });
  });

  describe("Error Details (V1.11)", () => {
    it("offers Show Details for an unexpected failure, opening a log with no business data", async () => {
      vi.mocked(convertText).mockRejectedValue(new ApiError("Unrecognized file format", false));
      render(<HomeScreen onConverted={vi.fn()} debugMode={false} />);

      fireEvent.change(pasteTextarea(), { target: { value: "bad data" } });
      fireEvent.click(screen.getByRole("button", { name: /convert/i }));

      await screen.findByText("Unrecognized file format");
      fireEvent.click(screen.getByRole("button", { name: /show details/i }));

      expect(await screen.findByText(/Operation: Conversion/)).toBeInTheDocument();
      expect(screen.getByText(/Error Message: Unrecognized file format/)).toBeInTheDocument();
      // Regression guard (spec section 15): the log must never contain
      // converted-data fields, even though this test's own error text
      // doesn't happen to include any.
      expect(screen.getByText(/Operation: Conversion/).closest("pre")?.textContent).not.toMatch(/PPID|TS#\d/);
    });

    it("does not offer Show Details for a validation error, since its message may echo the user's own data", async () => {
      vi.mocked(convertText).mockRejectedValue(
        new ApiError("Description file has duplicate PPID(s): AB000010_1, AB000020_1", true)
      );
      render(<HomeScreen onConverted={vi.fn()} debugMode={false} />);

      fireEvent.change(pasteTextarea(), { target: { value: "bad data" } });
      fireEvent.click(screen.getByRole("button", { name: /convert/i }));

      await screen.findByText(/duplicate PPID/);
      expect(screen.queryByRole("button", { name: /show details/i })).not.toBeInTheDocument();
    });
  });

  describe("Abort recovery (V1.08)", () => {
    it("cancels the in-flight request and returns to a clean, usable state", async () => {
      vi.mocked(convertText).mockImplementation(
        (_text, _debug, signal) =>
          new Promise((_resolve, reject) => {
            signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
          })
      );
      const toastErrorSpy = vi.spyOn(toast, "error");
      const onConverted = vi.fn();

      render(<HomeScreen onConverted={onConverted} debugMode={false} />);
      fireEvent.change(pasteTextarea(), {
        target: { value: "PPID\tParameter\tValue\nX1\tPPID\tX1" },
      });
      fireEvent.click(screen.getByRole("button", { name: /convert/i }));

      // ProcessingOverlay's Abort button opens the confirmation dialog.
      fireEvent.click(await screen.findByRole("button", { name: /^abort$/i }));
      await screen.findByText("Abort current conversion?");
      // Both the overlay's Abort trigger and the dialog's confirm Abort
      // button are now on screen with the same accessible name - the
      // dialog's own button is the one added last (portaled after it).
      const abortButtons = screen.getAllByRole("button", { name: /^abort$/i });
      fireEvent.click(abortButtons[abortButtons.length - 1]);

      // MUI keeps the rest of the app aria-hidden until the dialog has
      // fully closed (including its exit transition) - wait for that
      // before querying by role, or the still-transitioning-out dialog
      // hides everything else from accessibility queries.
      await waitFor(() => expect(screen.queryByText("Abort current conversion?")).not.toBeInTheDocument());

      // The app must not be left mid-request or showing an error - Convert
      // is usable again and nothing was reported as a failure.
      await waitFor(() => expect(screen.queryByText("Processing Excel File...")).not.toBeInTheDocument());
      expect(screen.getByRole("button", { name: /convert/i })).not.toBeDisabled();
      expect(onConverted).not.toHaveBeenCalled();
      expect(toastErrorSpy).not.toHaveBeenCalled();
    });
  });
});
