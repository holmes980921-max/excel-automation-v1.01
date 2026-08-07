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
});
