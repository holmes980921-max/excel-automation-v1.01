import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import ProcessingOverlay from "./ProcessingOverlay";

describe("ProcessingOverlay", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders nothing when closed", () => {
    const { container } = render(<ProcessingOverlay open={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the processing message and first stage immediately when opened", () => {
    render(<ProcessingOverlay open={true} />);
    expect(screen.getByText("Processing Excel File...")).toBeInTheDocument();
    expect(screen.getByText("Reading Excel")).toBeInTheDocument();
  });

  it("advances through processing stages over time", () => {
    render(<ProcessingOverlay open={true} />);
    expect(screen.getByText("Reading Excel")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(900);
    });
    expect(screen.getByText("Parsing Workbook")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(900);
    });
    expect(screen.getByText("Applying Transformation Rules")).toBeInTheDocument();
  });

  it("shows an estimated time when a file size is given", () => {
    render(<ProcessingOverlay open={true} fileSizeMB={30} />);
    expect(screen.getByText(/estimated/)).toBeInTheDocument();
  });

  it("does not show an estimate when no file size is given (paste mode)", () => {
    render(<ProcessingOverlay open={true} />);
    expect(screen.queryByText(/estimated/)).not.toBeInTheDocument();
  });
});
