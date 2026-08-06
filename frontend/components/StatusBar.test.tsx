import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import StatusBar from "./StatusBar";

describe("StatusBar", () => {
  it("shows Ready when there is no transient status message", () => {
    render(<StatusBar totalRows={10} columnCount={9} filteredCount={10} currentRuleName="Default" />);
    expect(screen.getByText("Ready")).toBeInTheDocument();
  });

  it("shows the transient status message instead of Ready when one is active", () => {
    render(
      <StatusBar
        totalRows={10}
        columnCount={9}
        filteredCount={10}
        currentRuleName="Default"
        statusMessage="Converted 10 rows"
      />
    );
    expect(screen.getByText("Converted 10 rows")).toBeInTheDocument();
    expect(screen.queryByText("Ready")).not.toBeInTheDocument();
  });

  it("shows rows/columns/filtered/current rule (completion feedback fields)", () => {
    render(<StatusBar totalRows={814} columnCount={9} filteredCount={38} currentRuleName="Engineering" />);
    expect(screen.getByText("814")).toBeInTheDocument();
    expect(screen.getByText("38")).toBeInTheDocument();
    expect(screen.getByText("Engineering")).toBeInTheDocument();
  });

  it("shows elapsed time (conversion time) when provided", () => {
    render(
      <StatusBar
        totalRows={814}
        columnCount={9}
        filteredCount={814}
        currentRuleName="Default"
        conversionTimeSeconds={1.234}
      />
    );
    expect(screen.getByText("1.23 sec")).toBeInTheDocument();
  });

  it("only shows debug metrics when explicitly provided (opt-in Debug Mode)", () => {
    const { rerender } = render(
      <StatusBar totalRows={1} columnCount={9} filteredCount={1} currentRuleName="Default" />
    );
    expect(screen.queryByText(/MB/)).not.toBeInTheDocument();

    rerender(
      <StatusBar
        totalRows={1}
        columnCount={9}
        filteredCount={1}
        currentRuleName="Default"
        debugPeakMemoryMb={12.3}
        debugEngineUsed="calamine"
      />
    );
    expect(screen.getByText("12.3 MB")).toBeInTheDocument();
    expect(screen.getByText("calamine")).toBeInTheDocument();
  });
});
