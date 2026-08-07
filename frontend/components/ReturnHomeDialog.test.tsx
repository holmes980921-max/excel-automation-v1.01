import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ReturnHomeDialog from "./ReturnHomeDialog";

describe("ReturnHomeDialog", () => {
  it("renders nothing when closed", () => {
    render(<ReturnHomeDialog open={false} onConfirmHome={vi.fn()} onStay={vi.fn()} />);
    expect(screen.queryByText("Return to Home?")).not.toBeInTheDocument();
  });

  it("shows the discard warning and both actions when open", () => {
    render(<ReturnHomeDialog open={true} onConfirmHome={vi.fn()} onStay={vi.fn()} />);
    expect(screen.getByText("Return to Home?")).toBeInTheDocument();
    expect(screen.getByText("Current session will be discarded.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Home" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Stay" })).toBeInTheDocument();
  });

  it("calls onConfirmHome when Home is clicked", () => {
    const onConfirmHome = vi.fn();
    render(<ReturnHomeDialog open={true} onConfirmHome={onConfirmHome} onStay={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Home" }));
    expect(onConfirmHome).toHaveBeenCalledOnce();
  });

  it("calls onStay when Stay is clicked", () => {
    const onStay = vi.fn();
    render(<ReturnHomeDialog open={true} onConfirmHome={vi.fn()} onStay={onStay} />);
    fireEvent.click(screen.getByRole("button", { name: "Stay" }));
    expect(onStay).toHaveBeenCalledOnce();
  });
});
