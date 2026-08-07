import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AbortConfirmDialog from "./AbortConfirmDialog";

describe("AbortConfirmDialog", () => {
  it("renders nothing when closed", () => {
    render(<AbortConfirmDialog open={false} onAbort={vi.fn()} onContinue={vi.fn()} />);
    expect(screen.queryByText("Abort current conversion?")).not.toBeInTheDocument();
  });

  it("shows the discard warning and both actions when open", () => {
    render(<AbortConfirmDialog open={true} onAbort={vi.fn()} onContinue={vi.fn()} />);
    expect(screen.getByText("Abort current conversion?")).toBeInTheDocument();
    expect(
      screen.getByText("Current conversion will stop. Unfinished results will be discarded.")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Abort" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue" })).toBeInTheDocument();
  });

  it("calls onAbort when Abort is clicked", () => {
    const onAbort = vi.fn();
    render(<AbortConfirmDialog open={true} onAbort={onAbort} onContinue={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Abort" }));
    expect(onAbort).toHaveBeenCalledOnce();
  });

  it("calls onContinue when Continue is clicked", () => {
    const onContinue = vi.fn();
    render(<AbortConfirmDialog open={true} onAbort={vi.fn()} onContinue={onContinue} />);
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(onContinue).toHaveBeenCalledOnce();
  });
});
