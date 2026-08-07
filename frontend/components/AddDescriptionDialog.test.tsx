import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AddDescriptionDialog from "./AddDescriptionDialog";
import { addDescription, type AddDescriptionResponse } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  addDescription: vi.fn(),
}));

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
});
