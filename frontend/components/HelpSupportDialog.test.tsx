import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import HelpSupportDialog from "./HelpSupportDialog";

const DOCS: Record<string, string> = {
  "/docs/USER_GUIDE.md": "# User Guide\n\nGetting started text.",
  "/docs/FAQ.md": "# FAQ\n\n## What data should I use?\n\nData downloaded from RCC.\n\n## How do I copy a log?\n\nClick Copy Log.",
  "/docs/TROUBLESHOOTING.md": "# Troubleshooting\n\nGeneral approach text.",
};

function mockDocsFetch() {
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) => {
      const content = DOCS[url];
      if (content === undefined) return Promise.resolve({ ok: false, status: 404 });
      return Promise.resolve({ ok: true, text: () => Promise.resolve(content) });
    })
  );
}

describe("HelpSupportDialog", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders nothing meaningful when closed", () => {
    mockDocsFetch();
    render(<HelpSupportDialog open={false} onClose={vi.fn()} />);
    expect(screen.queryByText("Help & Support")).not.toBeInTheDocument();
  });

  it("shows the User Guide tab by default", async () => {
    mockDocsFetch();
    render(<HelpSupportDialog open={true} onClose={vi.fn()} />);
    expect(screen.getByText("Help & Support")).toBeInTheDocument();
    expect(await screen.findByText("Getting started text.")).toBeInTheDocument();
  });

  it("switches to the FAQ tab and renders each question as its own accordion", async () => {
    mockDocsFetch();
    render(<HelpSupportDialog open={true} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("tab", { name: "FAQ" }));

    expect(await screen.findByText("What data should I use?")).toBeInTheDocument();
    expect(screen.getByText("How do I copy a log?")).toBeInTheDocument();
    // Answers are collapsed until expanded (not simultaneously visible with the question list rendered flat).
    fireEvent.click(screen.getByText("What data should I use?"));
    expect(await screen.findByText("Data downloaded from RCC.")).toBeInTheDocument();
  });

  it("switches to the Troubleshooting tab", async () => {
    mockDocsFetch();
    render(<HelpSupportDialog open={true} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("tab", { name: "Troubleshooting" }));
    expect(await screen.findByText("General approach text.")).toBeInTheDocument();
  });

  it("shows the Error Details tab with the privacy guarantee and developer contact, with no fetch required", () => {
    mockDocsFetch();
    render(<HelpSupportDialog open={true} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("tab", { name: "Error Details" }));

    expect(screen.getByText(/not a developer Debug Mode/i)).toBeInTheDocument();
    expect(screen.getByText(/never includes your data/i)).toBeInTheDocument();
    expect(screen.getByText("jong10k.kim")).toBeInTheDocument();
  });

  // Regression test for the V1.11 follow-up bug: NEXT_PUBLIC_BASE_PATH
  // wasn't actually wired into the deployed build, so every doc fetch hit
  // the wrong (un-prefixed) URL on GitHub Pages and 404'd - this proves
  // the dialog surfaces that failure visibly rather than staying blank,
  // and separately (next.config.test.ts) that the basePath wiring itself
  // is correct so this 404 path isn't hit in production.
  it("shows a clear error on the User Guide tab if the doc fails to load (404)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    render(<HelpSupportDialog open={true} onClose={vi.fn()} />);

    expect(await screen.findByText(/Could not load USER_GUIDE documentation \(404\)/)).toBeInTheDocument();
  });

  it("calls onClose when Close is clicked", () => {
    mockDocsFetch();
    const onClose = vi.fn();
    render(<HelpSupportDialog open={true} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
