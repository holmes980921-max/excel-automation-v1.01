import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AddDescriptionDialog from "./AddDescriptionDialog";
import { addDescription, addDescriptionFromClipboard, ApiError, type AddDescriptionResponse } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  addDescription: vi.fn(),
  addDescriptionFromClipboard: vi.fn(),
  ApiError: class ApiError extends Error {
    isValidationError: boolean;
    constructor(message: string, isValidationError = false) {
      super(message);
      this.isValidationError = isValidationError;
    }
  },
}));

function pasteInto(element: Element, text: string, html?: string) {
  fireEvent.paste(element, {
    clipboardData: {
      getData: (type: string) => (type === "text/html" ? (html ?? "") : text),
    },
  });
}

const RESPONSE: AddDescriptionResponse = {
  columns: ["PPID", "DESC"],
  rows: [{ PPID: "X1", DESC: "note" }],
  total_rows: 1,
  matched_count: 1,
  unmatched_count: 0,
  unmatched_ppids: [],
};

// MUI's Dialog portals its content to document.body rather than rendering
// inline, so the file input has to be found there, not in render()'s own
// container.
function selectFile(file: File) {
  const input = document.body.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(input, { target: { files: [file] } });
}

describe("AddDescriptionDialog", () => {
  beforeEach(() => {
    vi.mocked(addDescription).mockReset();
    vi.mocked(addDescriptionFromClipboard).mockReset();
  });

  it("Add Description stays disabled until a file is selected", () => {
    render(<AddDescriptionDialog open={true} onClose={vi.fn()} baseRows={[]} onMerged={vi.fn()} />);
    expect(screen.getByRole("button", { name: /^add description$/i })).toBeDisabled();
  });

  it("shows a Selected File card once a file is chosen, and Remove clears it (V1.09)", async () => {
    render(<AddDescriptionDialog open={true} onClose={vi.fn()} baseRows={[]} onMerged={vi.fn()} />);
    const file = new File(["dummy"], "descriptions.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    selectFile(file);

    expect(await screen.findByText("descriptions.xlsx")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^add description$/i })).not.toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: /remove/i }));

    expect(screen.queryByText("descriptions.xlsx")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^add description$/i })).toBeDisabled();
  });

  it("merges the selected file and reports the result", async () => {
    vi.mocked(addDescription).mockResolvedValue(RESPONSE);
    const onMerged = vi.fn();
    const baseRows = [{ PPID: "X1" }];
    render(<AddDescriptionDialog open={true} onClose={vi.fn()} baseRows={baseRows} onMerged={onMerged} />);
    const file = new File(["dummy"], "descriptions.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    selectFile(file);
    await screen.findByText("descriptions.xlsx");

    fireEvent.click(screen.getByRole("button", { name: /^add description$/i }));

    await waitFor(() => expect(onMerged).toHaveBeenCalledWith(RESPONSE));
    expect(addDescription).toHaveBeenCalledWith(file, baseRows);
  });

  // V1.10: Add Description previously only supported Drag & Drop/Upload -
  // Clipboard Paste is new this version (see engine.ts's
  // addDescriptionFromClipboard, which unifies all three input methods
  // through the same normalization pipeline).
  describe("Clipboard Paste (V1.10)", () => {
    it("shows a Clipboard Loaded summary after pasting, and Clear resets it", () => {
      render(<AddDescriptionDialog open={true} onClose={vi.fn()} baseRows={[]} onMerged={vi.fn()} />);
      pasteInto(screen.getByPlaceholderText(/paste ppid\/desc data/i), "PPID\tDESC\nX1\tnote");

      expect(screen.getByText("Clipboard Loaded")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^add description$/i })).not.toBeDisabled();

      fireEvent.click(screen.getByRole("button", { name: /clear/i }));

      expect(screen.queryByText("Clipboard Loaded")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^add description$/i })).toBeDisabled();
    });

    it("merges pasted text/plain TSV data via addDescriptionFromClipboard", async () => {
      vi.mocked(addDescriptionFromClipboard).mockResolvedValue(RESPONSE);
      const onMerged = vi.fn();
      const baseRows = [{ PPID: "X1" }];
      render(<AddDescriptionDialog open={true} onClose={vi.fn()} baseRows={baseRows} onMerged={onMerged} />);

      pasteInto(screen.getByPlaceholderText(/paste ppid\/desc data/i), "PPID\tDESC\nX1\tnote");
      fireEvent.click(screen.getByRole("button", { name: /^add description$/i }));

      await waitFor(() => expect(onMerged).toHaveBeenCalledWith(RESPONSE));
      expect(addDescriptionFromClipboard).toHaveBeenCalledWith(
        { text: "PPID\tDESC\nX1\tnote", html: undefined },
        baseRows
      );
    });

    it("passes along text/html clipboard data when Excel provides it", async () => {
      vi.mocked(addDescriptionFromClipboard).mockResolvedValue(RESPONSE);
      const baseRows = [{ PPID: "X1" }];
      render(<AddDescriptionDialog open={true} onClose={vi.fn()} baseRows={baseRows} onMerged={vi.fn()} />);

      const html = "<table><tr><td>PPID</td><td>DESC</td></tr><tr><td>X1</td><td>note</td></tr></table>";
      pasteInto(screen.getByPlaceholderText(/paste ppid\/desc data/i), "PPID\tDESC\nX1\tnote", html);
      fireEvent.click(screen.getByRole("button", { name: /^add description$/i }));

      await waitFor(() => expect(addDescriptionFromClipboard).toHaveBeenCalled());
      expect(vi.mocked(addDescriptionFromClipboard).mock.calls[0][0]).toEqual({
        text: "PPID\tDESC\nX1\tnote",
        html,
      });
    });

    it("pasting clears a previously selected file, and selecting a file clears a previous paste", async () => {
      render(<AddDescriptionDialog open={true} onClose={vi.fn()} baseRows={[]} onMerged={vi.fn()} />);
      const file = new File(["dummy"], "descriptions.xlsx", {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const input = document.body.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(input, { target: { files: [file] } });
      await screen.findByText("descriptions.xlsx");

      pasteInto(screen.getByPlaceholderText(/paste ppid\/desc data/i), "PPID\tDESC\nX1\tnote");
      expect(screen.queryByText("descriptions.xlsx")).not.toBeInTheDocument();
      expect(screen.getByText("Clipboard Loaded")).toBeInTheDocument();
    });
  });

  describe("Error Details (V1.11)", () => {
    it("offers Show Details for an unexpected merge failure", async () => {
      vi.mocked(addDescriptionFromClipboard).mockRejectedValue(
        new ApiError("Description file is missing required column(s): DESC", false)
      );
      render(<AddDescriptionDialog open={true} onClose={vi.fn()} baseRows={[{ PPID: "X1" }]} onMerged={vi.fn()} />);

      pasteInto(screen.getByPlaceholderText(/paste ppid\/desc data/i), "PPID\nX1");
      fireEvent.click(screen.getByRole("button", { name: /^add description$/i }));

      await screen.findByText(/missing required column/);
      fireEvent.click(screen.getByRole("button", { name: /show details/i }));

      expect(await screen.findByText(/Operation: Add Description/)).toBeInTheDocument();
    });

    it("does not offer Show Details for a duplicate-PPID validation error", async () => {
      vi.mocked(addDescriptionFromClipboard).mockRejectedValue(
        new ApiError("Description file has duplicate PPID(s): AB000010_1, AB000020_1", true)
      );
      render(<AddDescriptionDialog open={true} onClose={vi.fn()} baseRows={[{ PPID: "AB000010_1" }]} onMerged={vi.fn()} />);

      pasteInto(screen.getByPlaceholderText(/paste ppid\/desc data/i), "PPID\tDESC\nAB000010_1\ta\nAB000010_1\tb");
      fireEvent.click(screen.getByRole("button", { name: /^add description$/i }));

      // The duplicate-PPID list is expected inline (existing V1.06 UX,
      // already visible to the user) - only the copyable diagnostic log
      // is withheld, since it would otherwise duplicate that same PPID
      // list into a form meant to be pasted into a bug report elsewhere.
      await screen.findByText(/duplicate PPID/);
      expect(screen.queryByRole("button", { name: /show details/i })).not.toBeInTheDocument();
    });
  });
});
