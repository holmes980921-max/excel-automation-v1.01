import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Home from "./page";
import { convertText, type ConvertResponse } from "@/lib/api";
import { saveRule, setActiveRuleId } from "@/lib/rules";

vi.mock("@/lib/api", () => ({
  convertText: vi.fn(),
  convertFile: vi.fn(),
  addDescription: vi.fn(),
  exportRows: vi.fn(),
  saveAs: vi.fn(),
  downloadBase64File: vi.fn(),
  getBackendVersion: vi.fn().mockResolvedValue(null),
  checkHealth: vi.fn().mockResolvedValue(true),
  base64ToBlob: vi.fn(),
  ApiError: class ApiError extends Error {},
}));

const RESPONSE: ConvertResponse = {
  filename: "converted.xlsx",
  columns: ["PPID", "TS#"],
  rows: [{ PPID: "X1", "TS#": "TS#1" }],
  total_rows: 1,
  summary: { ppid_count: 1, ts_count: 1, generated_rows: 1, conversion_time_seconds: 0.1 },
  debug: null,
};

function pasteInto(element: Element, text: string) {
  fireEvent.paste(element, { clipboardData: { getData: () => text } });
}

async function convertViaPaste() {
  pasteInto(screen.getByPlaceholderText(/paste excel data/i), "PPID\tParameter\tValue\nX1\tPPID\tX1");
  fireEvent.click(screen.getByRole("button", { name: /convert/i }));
  await waitFor(() => expect(screen.getByText("Converted")).toBeInTheDocument());
}

describe("Home Reset (V1.09 bug fix)", () => {
  beforeEach(() => {
    vi.mocked(convertText).mockReset();
    vi.mocked(convertText).mockResolvedValue(RESPONSE);
    window.localStorage.clear();
  });

  it(
    "fully returns to the Home screen and clears the workflow badges/search",
    async () => {
      render(<Home />);
      await convertViaPaste();

      fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: "X1" } });
      expect(screen.getByPlaceholderText(/search/i)).toHaveValue("X1");

      fireEvent.click(screen.getByRole("button", { name: /home/i }));
      const dialogTitle = await screen.findByText("Return to Home?");
      // The toolbar's own Home button is aria-hidden while the confirm dialog
      // is open (MUI hides the rest of the app from a11y queries while a
      // modal is up) - only the dialog's "Home" button is reachable here.
      fireEvent.click(screen.getByRole("button", { name: /^home$/i }));
      await waitFor(() => expect(dialogTitle).not.toBeInTheDocument());

      // Back on the Home screen - the data-dependent toolbar/search/badges are gone.
      expect(await screen.findByPlaceholderText(/paste excel data/i)).toBeInTheDocument();
      expect(screen.queryByText("Converted")).not.toBeInTheDocument();
      expect(screen.queryByPlaceholderText(/search/i)).not.toBeInTheDocument();
    },
    // This test chains several waitFor/findBy steps (paste -> convert ->
    // search -> Home confirm -> dialog close) - the default 5s timeout was
    // occasionally too tight under coverage-instrumentation overhead.
    10000
  );

  it("resets the active Transformation Rule back to Default, not just the data", async () => {
    // Seed a non-default active rule, as if the user customized one during
    // a previous session - this is exactly the state V1.09's bug report
    // said leaked across a Home reset.
    const saved = saveRule({
      rule_name: "Engineering",
      output_columns: ["PPID", "TS#"],
      column_order: ["PPID", "TS#"],
      aliases: {},
    });
    setActiveRuleId(saved.id);

    render(<Home />);
    await convertViaPaste();
    expect(screen.getByText("Engineering")).toBeInTheDocument(); // StatusBar's "Current Rule"

    fireEvent.click(screen.getByRole("button", { name: /home/i }));
    const dialogTitle = await screen.findByText("Return to Home?");
    fireEvent.click(screen.getByRole("button", { name: /^home$/i }));
    await waitFor(() => expect(dialogTitle).not.toBeInTheDocument());
    await screen.findByPlaceholderText(/paste excel data/i);

    await convertViaPaste();
    expect(screen.getByText("Default")).toBeInTheDocument();
    expect(screen.queryByText("Engineering")).not.toBeInTheDocument();
  });
});
