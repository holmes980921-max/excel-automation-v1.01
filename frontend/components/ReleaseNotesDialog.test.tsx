import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ReleaseNotesDialog from "./ReleaseNotesDialog";
import { RELEASE_NOTES } from "@/lib/releaseNotes";

describe("ReleaseNotesDialog", () => {
  it("renders nothing meaningful when closed", () => {
    render(<ReleaseNotesDialog open={false} onClose={vi.fn()} />);
    expect(screen.queryByText("Release Notes")).not.toBeInTheDocument();
  });

  it("shows every version with the most recent expanded by default", () => {
    render(<ReleaseNotesDialog open={true} onClose={vi.fn()} />);

    expect(screen.getByText("Release Notes")).toBeInTheDocument();
    for (const note of RELEASE_NOTES) {
      expect(screen.getByText(`${note.version} - ${note.title}`)).toBeInTheDocument();
    }
    // The most recent entry's content is visible without expanding anything.
    const latest = RELEASE_NOTES[0];
    const firstItem = latest.new[0] ?? latest.improved[0] ?? latest.fixed[0] ?? latest.knownIssues[0];
    expect(screen.getByText(firstItem)).toBeInTheDocument();
  });

  it("calls onClose when Close is clicked", () => {
    const onClose = vi.fn();
    render(<ReleaseNotesDialog open={true} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
