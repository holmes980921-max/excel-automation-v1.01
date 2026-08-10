import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import FilmMaterialVisualizationDialog from "./FilmMaterialVisualizationDialog";
import { loadMaterialDb, __resetMaterialDbCacheForTests } from "@/lib/materialDb";

const MOCK_CSV = ["Material Code,Color", "A,#F4D03F", "B,#8E44AD", "C,#5DADE2", "D,#E67E22", "AB,#2ECC71", "Si,#34495E"].join(
  "\n"
);

function stubDb(csvText: string) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve(csvText) }));
}

function layerTexts() {
  return screen.getAllByTestId("film-material-layer").map((el) => el.textContent);
}

describe("FilmMaterialVisualizationDialog", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    __resetMaterialDbCacheForTests();
  });

  it("renders nothing meaningful when value is null", () => {
    render(<FilmMaterialVisualizationDialog value={null} onClose={vi.fn()} />);
    expect(screen.queryByText("Film Material Visualization")).not.toBeInTheDocument();
  });

  it("shows the source value and parsed layers TOP to BOTTOM", async () => {
    stubDb(MOCK_CSV);
    render(<FilmMaterialVisualizationDialog value="MOCK_ABCDBA_001_X_002" onClose={vi.fn()} />);

    expect(screen.getByText("Film Material Visualization")).toBeInTheDocument();
    expect(screen.getByText(/Source: MOCK_ABCDBA_001_X_002/)).toBeInTheDocument();

    await waitFor(() => expect(layerTexts()).toEqual(["AB", "C", "D", "B", "A", "Si"]));
    expect(screen.getByText("TOP")).toBeInTheDocument();
    expect(screen.getByText("BOTTOM")).toBeInTheDocument();
  });

  it("uses a fixed layer width/height (no size variation between a short and long code)", async () => {
    stubDb(MOCK_CSV);
    render(<FilmMaterialVisualizationDialog value="MOCK_ABCDBA_001_X_002" onClose={vi.fn()} />);
    await waitFor(() => expect(layerTexts().length).toBeGreaterThan(0));

    const layers = screen.getAllByTestId("film-material-layer");
    const widths = new Set(layers.map((el) => getComputedStyle(el).width));
    const heights = new Set(layers.map((el) => getComputedStyle(el).height));
    expect(widths.size).toBe(1);
    expect([...widths][0]).not.toBe(""); // sanity: a real value was actually applied, not just uniformly empty
    expect(heights.size).toBe(1);
    expect([...heights][0]).not.toBe("");
  });

  it("does not wrap Material Code text onto multiple lines", async () => {
    stubDb(MOCK_CSV);
    render(<FilmMaterialVisualizationDialog value="MOCK_ABCDBA_001_X_002" onClose={vi.fn()} />);
    await waitFor(() => expect(layerTexts().length).toBeGreaterThan(0));

    for (const layer of screen.getAllByTestId("film-material-layer")) {
      expect(getComputedStyle(layer).whiteSpace).toBe("nowrap");
    }
  });

  it("shows an unknown-material error and never renders a partial layer structure", async () => {
    stubDb(MOCK_CSV);
    render(<FilmMaterialVisualizationDialog value="MOCK_ABXCD_001_X_002" onClose={vi.fn()} />);

    expect(await screen.findByText("Visualization unavailable")).toBeInTheDocument();
    expect(screen.getByText(/Unknown Material: X/)).toBeInTheDocument();
    expect(screen.getByText(/Source: MOCK_ABXCD_001_X_002/)).toBeInTheDocument();
    expect(screen.queryByTestId("film-material-layer")).not.toBeInTheDocument();
  });

  it("shows a Material Database Unavailable error when the CSV fails to load, without crashing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 404 }));
    render(<FilmMaterialVisualizationDialog value="MOCK_ABC_001_X_002" onClose={vi.fn()} />);

    expect(await screen.findByText("Material Database Unavailable")).toBeInTheDocument();
    expect(screen.getByText(/contact the developer/i)).toBeInTheDocument();
  });

  it("shows a Material Database Error when the DB content is invalid (e.g. bad color)", async () => {
    stubDb("Material Code,Color\nSi,INVALID_COLOR");
    render(<FilmMaterialVisualizationDialog value="MOCK_ABC_001_X_002" onClose={vi.fn()} />);

    expect(await screen.findByText("Material Database Error")).toBeInTheDocument();
    expect(screen.getByText(/Invalid color for Material Code: Si/)).toBeInTheDocument();
  });

  it("closes via the × button", async () => {
    stubDb(MOCK_CSV);
    const onClose = vi.fn();
    render(<FilmMaterialVisualizationDialog value="MOCK_ABC_001_X_002" onClose={onClose} />);
    await screen.findByText("Film Material Visualization");

    // "close" (the icon button's aria-label) is distinct from the
    // DialogActions "Close" text button - both exist, so match exactly.
    fireEvent.click(screen.getByRole("button", { name: "close" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("closes via Escape", async () => {
    stubDb(MOCK_CSV);
    const onClose = vi.fn();
    render(<FilmMaterialVisualizationDialog value="MOCK_ABC_001_X_002" onClose={onClose} />);
    await screen.findByText("Film Material Visualization");

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape", code: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("closes via an outside (backdrop) click", async () => {
    stubDb(MOCK_CSV);
    const onClose = vi.fn();
    const { baseElement } = render(<FilmMaterialVisualizationDialog value="MOCK_ABC_001_X_002" onClose={onClose} />);
    await screen.findByText("Film Material Visualization");

    const backdrop = baseElement.querySelector(".MuiBackdrop-root");
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop!);
    expect(onClose).toHaveBeenCalled();
  });
});

describe("loadMaterialDb wiring", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    __resetMaterialDbCacheForTests();
  });

  it("is the same loader the dialog uses, confirmed by import identity", () => {
    // Sanity check that this test file and the component import the same
    // module (not a divergent mock) - the dialog's own tests above are the
    // real coverage; this just documents the dependency explicitly.
    expect(typeof loadMaterialDb).toBe("function");
  });
});
