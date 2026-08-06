import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import StatusBar from "./StatusBar";

describe("StatusBar", () => {
  it("shows Ready when there is no transient status message", () => {
    render(
      <StatusBar totalRows={10} columnCount={9} shownCount={10} previewLimit={100} currentRuleName="Default" />
    );
    expect(screen.getByText("Ready")).toBeInTheDocument();
  });

  it("shows the transient status message instead of Ready when one is active", () => {
    render(
      <StatusBar
        totalRows={10}
        columnCount={9}
        shownCount={10}
        previewLimit={100}
        currentRuleName="Default"
        statusMessage="Converted 10 rows"
      />
    );
    expect(screen.getByText("Converted 10 rows")).toBeInTheDocument();
    expect(screen.queryByText("Ready")).not.toBeInTheDocument();
  });

  it("shows 'Showing X of Y rows' when not searching (Preview Rows, no search)", () => {
    render(
      <StatusBar totalRows={8542} columnCount={9} shownCount={100} previewLimit={100} currentRuleName="Engineering" />
    );
    expect(screen.getByText("Showing 100 of 8,542 rows")).toBeInTheDocument();
    expect(screen.getByText("Engineering")).toBeInTheDocument();
  });

  it("shows match count and 'first N rows' while searching with a finite preview limit", () => {
    render(
      <StatusBar
        totalRows={8542}
        columnCount={9}
        shownCount={100}
        previewLimit={100}
        matchCount={342}
        currentRuleName="Default"
      />
    );
    expect(screen.getByText("342 matches - Showing first 100 rows")).toBeInTheDocument();
  });

  it("shows 'showing all rows' while searching with Preview Rows = All", () => {
    render(
      <StatusBar
        totalRows={8542}
        columnCount={9}
        shownCount={342}
        previewLimit="all"
        matchCount={342}
        currentRuleName="Default"
      />
    );
    expect(screen.getByText("342 matches - Showing all rows")).toBeInTheDocument();
  });

  it("shows elapsed time (conversion time) when provided", () => {
    render(
      <StatusBar
        totalRows={814}
        columnCount={9}
        shownCount={814}
        previewLimit="all"
        currentRuleName="Default"
        conversionTimeSeconds={1.234}
      />
    );
    expect(screen.getByText("1.23 sec")).toBeInTheDocument();
  });

  it("only shows debug metrics when explicitly provided (opt-in Debug Mode)", () => {
    const { rerender } = render(
      <StatusBar totalRows={1} columnCount={9} shownCount={1} previewLimit={100} currentRuleName="Default" />
    );
    expect(screen.queryByText(/MB/)).not.toBeInTheDocument();

    rerender(
      <StatusBar
        totalRows={1}
        columnCount={9}
        shownCount={1}
        previewLimit={100}
        currentRuleName="Default"
        debugPeakMemoryMb={12.3}
        debugEngineUsed="calamine"
      />
    );
    expect(screen.getByText("12.3 MB")).toBeInTheDocument();
    expect(screen.getByText("calamine")).toBeInTheDocument();
  });

  it("shows Description matched/unmatched stats only after Add Description has run", () => {
    const { rerender } = render(
      <StatusBar totalRows={10} columnCount={9} shownCount={10} previewLimit={100} currentRuleName="Default" />
    );
    expect(screen.queryByText(/Description Matched/)).not.toBeInTheDocument();

    rerender(
      <StatusBar
        totalRows={10}
        columnCount={9}
        shownCount={10}
        previewLimit={100}
        currentRuleName="Default"
        descriptionMatchedCount={7}
        descriptionUnmatchedCount={3}
      />
    );
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });
});
