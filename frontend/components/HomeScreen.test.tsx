import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { toast } from "sonner";
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

/** Simulates an actual paste (as opposed to typing) - HomeScreen intercepts
 * this via onPaste, never letting the text reach the controlled textarea
 * value (see lib/pasteSummary.ts / the V1.08 large-dataset fix). */
function pasteInto(element: Element, text: string) {
  fireEvent.paste(element, { clipboardData: { getData: () => text } });
}

describe("HomeScreen", () => {
  beforeEach(() => {
    vi.mocked(convertText).mockReset();
    vi.mocked(convertFile).mockReset();
  });

  it("disables Convert when there is no file or pasted text", () => {
    render(<HomeScreen onConverted={vi.fn()} debugMode={false} />);
    expect(screen.getByRole("button", { name: /convert/i })).toBeDisabled();
  });

  it("enables Convert once text is typed", () => {
    render(<HomeScreen onConverted={vi.fn()} debugMode={false} />);
    fireEvent.change(screen.getByPlaceholderText(/paste excel data/i), {
      target: { value: "PPID\tParameter\tValue\nX1\tPPID\tX1" },
    });
    expect(screen.getByRole("button", { name: /convert/i })).not.toBeDisabled();
  });

  it("converts typed text and reports the result via onConverted", async () => {
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

  describe("large paste (V1.08 freeze fix)", () => {
    it("shows a summary instead of rendering the raw pasted text", () => {
      render(<HomeScreen onConverted={vi.fn()} debugMode={false} />);
      const textarea = screen.getByPlaceholderText(/paste excel data/i);

      const bigText = "PPID\tParameter\tValue\n" + Array.from({ length: 5000 }, (_, i) => `P${i}\tPPID\tP${i}`).join("\n");
      pasteInto(textarea, bigText);

      expect(screen.getByText("Clipboard Loaded")).toBeInTheDocument();
      expect(screen.getByText("Rows: 5,000")).toBeInTheDocument();
      expect(screen.getByText("Columns: 3")).toBeInTheDocument();
      // The raw text must never appear as rendered textarea content.
      expect(screen.queryByPlaceholderText(/paste excel data/i)).not.toBeInTheDocument();
      expect(screen.queryByDisplayValue(bigText)).not.toBeInTheDocument();
    });

    it("converts using the full pasted text even though only a summary was rendered", async () => {
      vi.mocked(convertText).mockResolvedValue(RESPONSE);
      const onConverted = vi.fn();
      render(<HomeScreen onConverted={onConverted} debugMode={false} />);

      const bigText = "PPID\tParameter\tValue\nP1\tPPID\tP1\nP1\tTS#1_CardName\tCARD1";
      pasteInto(screen.getByPlaceholderText(/paste excel data/i), bigText);
      fireEvent.click(screen.getByRole("button", { name: /convert/i }));

      await waitFor(() => expect(onConverted).toHaveBeenCalledWith(RESPONSE));
      expect(convertText).toHaveBeenCalledWith(bigText, false, expect.any(AbortSignal));
    });

    it("Clear discards the summary and restores the empty paste box", () => {
      render(<HomeScreen onConverted={vi.fn()} debugMode={false} />);
      pasteInto(screen.getByPlaceholderText(/paste excel data/i), "PPID\tParameter\tValue\nP1\tPPID\tP1");
      expect(screen.getByText("Clipboard Loaded")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: /clear/i }));

      expect(screen.queryByText("Clipboard Loaded")).not.toBeInTheDocument();
      expect(screen.getByPlaceholderText(/paste excel data/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /convert/i })).toBeDisabled();
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
      fireEvent.change(screen.getByPlaceholderText(/paste excel data/i), {
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

  describe("Remove selected file (V1.09)", () => {
    function selectFile(container: HTMLElement, file: File) {
      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(input, { target: { files: [file] } });
    }

    it("shows a Selected File card with a Remove action once a file is chosen", async () => {
      const { container } = render(<HomeScreen onConverted={vi.fn()} debugMode={false} />);
      const file = new File(["dummy"], "sample.xlsx", {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      selectFile(container, file);

      // react-dropzone validates/processes the selected file asynchronously.
      expect(await screen.findByText("sample.xlsx")).toBeInTheDocument();
      expect(screen.getByText("Selected File")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /convert/i })).not.toBeDisabled();
    });

    it("Remove clears the selection and restores the empty upload dropzone", async () => {
      const { container } = render(<HomeScreen onConverted={vi.fn()} debugMode={false} />);
      const file = new File(["dummy"], "sample.xlsx", {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      selectFile(container, file);
      expect(await screen.findByText("sample.xlsx")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: /remove/i }));

      expect(screen.queryByText("sample.xlsx")).not.toBeInTheDocument();
      expect(screen.getByText(/drag & drop excel/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /convert/i })).toBeDisabled();
    });

    it("converts using the selected file after it survives to Convert", async () => {
      vi.mocked(convertFile).mockResolvedValue(RESPONSE);
      const onConverted = vi.fn();
      const { container } = render(<HomeScreen onConverted={onConverted} debugMode={false} />);
      const file = new File(["dummy"], "sample.xlsx", {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      selectFile(container, file);
      await screen.findByText("sample.xlsx");

      fireEvent.click(screen.getByRole("button", { name: /convert/i }));

      await waitFor(() => expect(onConverted).toHaveBeenCalledWith(RESPONSE));
      expect(convertFile).toHaveBeenCalledWith(file, false, expect.any(AbortSignal));
      expect(convertText).not.toHaveBeenCalled();
    });
  });
});
