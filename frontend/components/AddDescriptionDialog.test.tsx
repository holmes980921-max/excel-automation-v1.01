import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AddDescriptionDialog from "./AddDescriptionDialog";
import { addDescriptionFromClipboard, ApiError, type AddDescriptionResponse } from "@/lib/api";

vi.mock("@/lib/api", () => ({
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

/** V1.13 follow-up: the example PPID/DESC format lives in the paste area's
 * placeholder, not a separate visible block - matched on a substring unique
 * to it, mirroring HomeScreen.test.tsx's pasteTextarea() helper. */
function pasteTextarea() {
  return screen.getByPlaceholderText(/PPID1/);
}

const RESPONSE: AddDescriptionResponse = {
  columns: ["PPID", "DESC"],
  rows: [{ PPID: "X1", DESC: "note" }],
  total_rows: 1,
  matched_count: 1,
  unmatched_count: 0,
  unmatched_ppids: [],
};

describe("AddDescriptionDialog", () => {
  beforeEach(() => {
    vi.mocked(addDescriptionFromClipboard).mockReset();
  });

  describe("Clipboard Paste only (V1.13 follow-up fix)", () => {
    it("does not render a file upload input", () => {
      render(<AddDescriptionDialog open={true} onClose={vi.fn()} baseRows={[]} onMerged={vi.fn()} />);
      expect(document.body.querySelector('input[type="file"]')).not.toBeInTheDocument();
    });

    it("does not render any Drag & Drop or Upload/Browse affordance", () => {
      render(<AddDescriptionDialog open={true} onClose={vi.fn()} baseRows={[]} onMerged={vi.fn()} />);
      expect(screen.queryByText(/drag\s*&\s*drop/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/browse/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/^upload$/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/selected file/i)).not.toBeInTheDocument();
    });

    it("shows the PPID/DESC example format as a light placeholder, preserving the column relationship", () => {
      render(<AddDescriptionDialog open={true} onClose={vi.fn()} baseRows={[]} onMerged={vi.fn()} />);
      const textarea = pasteTextarea();
      expect(textarea).toHaveAttribute("placeholder", expect.stringContaining("PPID"));
      expect(textarea).toHaveAttribute("placeholder", expect.stringContaining("DESC"));
      expect(textarea).toHaveAttribute("placeholder", expect.stringContaining("PPID1"));
      expect(textarea).toHaveAttribute("placeholder", expect.stringContaining("DESC1"));
    });

    it("the placeholder disappears once data is pasted (never becomes part of the pasted data)", async () => {
      vi.mocked(addDescriptionFromClipboard).mockResolvedValue(RESPONSE);
      render(<AddDescriptionDialog open={true} onClose={vi.fn()} baseRows={[{ PPID: "X1" }]} onMerged={vi.fn()} />);

      pasteInto(pasteTextarea(), "PPID\tDESC\nX1\tnote");
      expect(screen.queryByPlaceholderText(/PPID1/)).not.toBeInTheDocument();
      expect(screen.getByText("Clipboard Loaded")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: /^add description$/i }));
      await waitFor(() => expect(addDescriptionFromClipboard).toHaveBeenCalled());
      // The example rows (PPID1/DESC1/...) were only ever placeholder text,
      // never sent as real data.
      expect(vi.mocked(addDescriptionFromClipboard).mock.calls[0][0].text).toBe("PPID\tDESC\nX1\tnote");
    });

    it("does not mention Upload or Drag & Drop in the dialog's description text", () => {
      render(<AddDescriptionDialog open={true} onClose={vi.fn()} baseRows={[]} onMerged={vi.fn()} />);
      expect(screen.queryByText(/upload/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/drag/i)).not.toBeInTheDocument();
      expect(screen.getByText(/paste the data directly from excel/i)).toBeInTheDocument();
    });
  });

  it("Add Description stays disabled until data is pasted", () => {
    render(<AddDescriptionDialog open={true} onClose={vi.fn()} baseRows={[]} onMerged={vi.fn()} />);
    expect(screen.getByRole("button", { name: /^add description$/i })).toBeDisabled();
  });

  describe("Clipboard Paste (matching behavior unchanged since V1.10)", () => {
    it("shows a Clipboard Loaded summary after pasting, and Clear resets it", () => {
      render(<AddDescriptionDialog open={true} onClose={vi.fn()} baseRows={[]} onMerged={vi.fn()} />);
      pasteInto(pasteTextarea(), "PPID\tDESC\nX1\tnote");

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

      pasteInto(pasteTextarea(), "PPID\tDESC\nX1\tnote");
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
      pasteInto(pasteTextarea(), "PPID\tDESC\nX1\tnote", html);
      fireEvent.click(screen.getByRole("button", { name: /^add description$/i }));

      await waitFor(() => expect(addDescriptionFromClipboard).toHaveBeenCalled());
      expect(vi.mocked(addDescriptionFromClipboard).mock.calls[0][0]).toEqual({
        text: "PPID\tDESC\nX1\tnote",
        html,
      });
    });
  });

  describe("Error Details (V1.11)", () => {
    it("offers Show Details for an unexpected merge failure", async () => {
      vi.mocked(addDescriptionFromClipboard).mockRejectedValue(
        new ApiError("Description file is missing required column(s): DESC", false)
      );
      render(<AddDescriptionDialog open={true} onClose={vi.fn()} baseRows={[{ PPID: "X1" }]} onMerged={vi.fn()} />);

      pasteInto(pasteTextarea(), "PPID\nX1");
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

      pasteInto(pasteTextarea(), "PPID\tDESC\nAB000010_1\ta\nAB000010_1\tb");
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
