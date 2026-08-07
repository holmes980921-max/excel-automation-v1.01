import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ErrorBoundary from "./ErrorBoundary";

function Bomb(): never {
  throw new Error("boom");
}

describe("ErrorBoundary", () => {
  // React (and our own componentDidCatch) log the caught error to
  // console.error - expected noise for these tests, silenced so the test
  // output stays readable.
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders children normally when nothing throws", () => {
    render(
      <ErrorBoundary>
        <div>All good</div>
      </ErrorBoundary>
    );
    expect(screen.getByText("All good")).toBeInTheDocument();
  });

  it("shows a recovery screen instead of crashing when a child throws", () => {
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    );
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /return to home/i })).toBeInTheDocument();
  });

  it("Return to Home triggers a navigation back to /", () => {
    const assign = vi.fn();
    const originalLocation = window.location;
    // jsdom's window.location isn't directly assignable/mockable in place -
    // replace it for this test only, restore afterwards.
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...originalLocation, assign },
    });

    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    );
    fireEvent.click(screen.getByRole("button", { name: /return to home/i }));

    expect(assign).toHaveBeenCalledWith("/");

    Object.defineProperty(window, "location", { configurable: true, value: originalLocation });
  });

  it("Show Log opens the Error Log Viewer with the caught error's detail", async () => {
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    );

    fireEvent.click(screen.getByRole("button", { name: /show log/i }));

    expect(await screen.findByText("Error Log")).toBeInTheDocument();
    expect(screen.getByText(/Error Message: boom/)).toBeInTheDocument();
    expect(screen.getByText(/Operation: UI Rendering/)).toBeInTheDocument();
    expect(screen.getByText(/Developer Contact: jong10k\.kim/)).toBeInTheDocument();
  });

  it("Copy Log writes the formatted log to the clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });

    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    );
    fireEvent.click(screen.getByRole("button", { name: /show log/i }));
    await screen.findByText("Error Log");
    fireEvent.click(screen.getByRole("button", { name: /copy log/i }));

    await vi.waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(writeText.mock.calls[0][0]).toContain("Error Message: boom");
  });
});
