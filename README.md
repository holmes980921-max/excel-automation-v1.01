# RCC Excel Automation - Browser Edition

A configurable Excel transformation tool. It converts a PPID / Parameter / Reference Value excel
export into a flat table - one row per `TS#` block - and lets you customize which columns appear,
in what order, and under what display name, entirely through the UI (no code changes required).

> Renamed from "Excel Automation" to "RCC Excel Automation" in V1.09 (branding only - no behavior
> change). Older per-version reports (`CODE_REVIEW_V1.0X.md`, etc.) keep their original title as a
> historical record and are not retroactively renamed.

## V1.10: Browser Edition (this branch)

**This `browser-edition` branch is a temporary, JavaScript/TypeScript-only build of the app that
runs entirely client-side and deploys as a static site to GitHub Pages** - no Python, no FastAPI,
no server of any kind. It exists to get real users on the app (and real usage feedback) while the
team's internal server access is still ~1 month out, ahead of a planned V2.0 Server Edition.

- **The Python/FastAPI implementation is preserved, untouched, on [`release/v1.09`](../../tree/release/v1.09).**
  This branch does not replace it - V2.0 will build on the FastAPI backend, not this branch.
- Every excel read/parse/transform/export step that used to be an HTTP call to FastAPI now runs
  locally in the browser (via a Web Worker - see [Architecture](#architecture) below). Nothing you
  upload or paste is ever sent anywhere.
- See [CODE_REVIEW_V1.10.md](./CODE_REVIEW_V1.10.md) for the full migration writeup, behavioral-
  parity regression results against the V1.09 Python engine, and known limitations.

**Current version: V1.12 - Film Material Visualization** (see the in-app **About** dialog for live
version/build info)

## Quick Start

**Hosted (recommended)**: open the deployed GitHub Pages URL - nothing to install. See
[Deployment](#deployment-github-pages) for the actual URL once published.

**Local (Windows), Browser Edition only:**

```
cd frontend
npm install
npm run dev
# open http://localhost:3000
```

No backend/Python setup is needed to run the Browser Edition locally - `run.bat`/`run.ps1` (below)
still exist for running the **V1.09 Python/FastAPI** implementation from this same checkout, in
case you need to compare behavior against it (V1.10's regression suite already does this
automatically - see [CODE_REVIEW_V1.10.md](./CODE_REVIEW_V1.10.md)).

## Features

### Film Material Visualization (V1.12)
- **Click a `filmmaterial` value in the result table** to see its layer structure visualized
  TOP to BOTTOM in a modal - each parsed Material Code rendered as a fixed-size, colored,
  black-bordered layer. Hovering a `filmmaterial` cell shows a pointer cursor; the value's Material
  DB color fills the layer background, with automatic black/white text for contrast.
- **Material DB is a plain, administrator-editable CSV** -
  [`frontend/public/data/material-db.csv`](./frontend/public/data/material-db.csv) (`Material
  Code,Color`) - no Material/color mapping is hard-coded in application code. Colors accept HEX
  (`#8E44AD`) or standard CSS color names (`purple`). Duplicate Material Codes are a validation
  error; duplicate colors across different codes are fine.
- **Longest Match First parsing** correctly tokenizes multi-character Material Codes (e.g. `AB`)
  out of a structure string like `ABCDBA` as `AB, C, D, B, A`, not `A, B, C, D, B, A` - see
  [`frontend/lib/filmMaterialParser.ts`](./frontend/lib/filmMaterialParser.ts).
- **Isolated by design**: a missing, unreadable, or invalid Material DB disables Visualization
  only - Excel conversion, Add Description, and every other V1.11 feature are completely
  unaffected. An unrecognized Material Code in a specific value shows a clear "Unknown Material"
  error for that value rather than an incorrect diagram.
- See [CODE_REVIEW_V1.12.md](./CODE_REVIEW_V1.12.md) for the full assessment, including a
  disclosed spec-ambiguity resolution in the required test cases.

### User Guide & Support (V1.11)
- **Help & Support** - a toolbar button (always visible, including from the Home screen) opens
  **User Guide**, **FAQ**, **Troubleshooting**, and **Error Details**, all in one dialog. Content
  is fetched from plain Markdown files under `frontend/public/docs/` at runtime - editable
  directly on GitHub without touching any React/TypeScript, and included automatically in the
  static export.
- **Input Data guidance is now explicit about the normal RCC workflow**: download from RCC, copy
  the downloaded data, paste it into RCC Excel Automation - with a documented Ctrl+A/Ctrl+C
  fallback for when a direct clipboard paste doesn't register.
- **Show Details on everyday failures, not just full-page crashes.** A failed Convert or Add
  Description now offers the same diagnostic log (timestamp, version, message, stack trace,
  browser/OS info) and **Copy Log** action that `ErrorBoundary`'s crash screen already had - not
  offered for a validation error whose message already reflects the user's own data (e.g. a
  duplicate-PPID list), since a copyable log would otherwise just duplicate that same list. See
  [CODE_REVIEW_V1.11.md](./CODE_REVIEW_V1.11.md) for the full reasoning.
- No conversion logic changed this version - see the Regression section of
  [CODE_REVIEW_V1.11.md](./CODE_REVIEW_V1.11.md).

### Browser Edition (V1.10)
- **Runs entirely in the browser, deployed as a static site to GitHub Pages.** No backend, no
  database, nothing uploaded to any server - conversion, rule shaping, Add Description, and
  `.xlsx` export all happen locally, in a Web Worker (see [Architecture](#architecture)).
- **Add Description now supports Clipboard Paste** (previously Upload/Drag & Drop only - a known
  V1.09 gap). All three input methods (Upload, Drag & Drop, Paste) funnel through the same
  normalization + merge pipeline, so results are identical regardless of how the data got in.
- **Abort now genuinely cancels an in-progress conversion.** V1.09's Abort only cancelled the
  browser's `fetch` - the backend's already-started computation ran to completion regardless, its
  result simply discarded. V1.10 runs conversion in a Web Worker; Abort calls `worker.terminate()`,
  which actually stops the computation - not a regression, an improvement made possible by the
  new architecture.
- See [CODE_REVIEW_V1.10.md](./CODE_REVIEW_V1.10.md) for the full assessment, including known
  limitations (large-file performance vs. the V1.09 calamine reader, Debug Mode's peak-memory
  figure).

### Support & Usability (V1.09)
- **Renamed to RCC Excel Automation** - applied to the browser title, header, Home screen,
  README, and CHANGELOG.
- **Fixed: Home now fully resets the session.** Previously, the active Transformation Rule and a
  transient status message could survive a Home reset, even though the converted data itself was
  cleared - clicking Home now returns everything (uploaded file, pasted data, preview, search,
  Description, workflow badges, status bar, and the active rule) to the literal initial state.
- **Remove / Clear before converting** - a selected file (Upload panel) or pasted data (Paste
  panel) can now be discarded with one click before Convert, instead of only being replaceable by
  picking something else. The same Remove affordance was added to the Add Description dialog for
  consistency.
- **Error Log Viewer** - an unexpected error now offers **Show Log**, revealing a timestamp,
  application version, operation, error message/stack trace, and environment info, with a
  one-click **Copy Log** and a developer contact - everything needed to file a useful bug report,
  and nothing about your converted data.
- **Release Notes** - a toolbar button opens an in-app changelog (New / Improved / Fixed / Known
  Issues per version), the primary place future updates get communicated.
- See [CODE_REVIEW_V1.09.md](./CODE_REVIEW_V1.09.md) for the full assessment.

### Production Readiness & Stability (V1.08)
- **No new functionality by design** - this release is entirely stabilization: refactoring,
  reliability, performance, dependency cleanup, and test/static-analysis coverage. See
  [CODE_REVIEW_V1.08.md](./CODE_REVIEW_V1.08.md) for the full assessment.
- **Fixed: pasting ~200,000+ rows no longer freezes the browser.** Pasted text is now intercepted
  before it ever reaches the DOM (it used to be bound directly to an auto-sizing textarea with no
  height cap); the UI instead shows a lightweight "Clipboard Loaded / Rows: N / Columns: N /
  Status: Ready to Convert" summary. Measured at ~9ms to summarize 200,000 rows - see
  [PERFORMANCE_REPORT_V1.08.md](./PERFORMANCE_REPORT_V1.08.md).
- **Fixed: a genuinely clean install was broken.** `psutil` (used on every conversion request) was
  missing from `requirements.txt` - `pip install -r requirements.txt` followed by starting the
  server would have crashed on the first request. Found and fixed via an actual fresh-virtualenv
  install test, not just a manifest read-through. See
  [DEPENDENCY_AUDIT_V1.08.md](./DEPENDENCY_AUDIT_V1.08.md).
- **A top-level error boundary** now catches unexpected UI errors and offers a "Return to Home"
  recovery action instead of a blank page.
- **Consolidated duplicated logic**: the "insert DESC after PPID" placement rule and the four API
  routes' exception-handling boilerplate were each independently written 2-4 times; both are now
  one shared implementation apiece, directly unit-tested.
- **Static analysis, for the first time**: ESLint is now configured and enforced (flagged as
  missing since V1.05); `noUnusedLocals`/`noUnusedParameters` enabled in `tsconfig.json`.
- **Test suites expanded**: backend 94% coverage (up from 88%), including a new large-dataset
  correctness test (~175,600 input rows) and direct tests of the newly-extracted shared logic;
  frontend gained Abort-recovery and ErrorBoundary tests. See
  [TEST_COVERAGE_V1.08.md](./TEST_COVERAGE_V1.08.md).

### Desktop-Quality UX (V1.07)
- **Home screen** - the application's starting point. No "Upload" click needed first: drag & drop
  a file, click to browse, or paste directly (Ctrl+V) into the two-panel Home layout, then
  **Convert**. Replaces the old modal upload dialog entirely.
- **Home navigation** - a **Home** button (top-left, always visible) returns to the Home screen at
  any time. If a conversion result exists, a confirmation ("Return to Home? Current session will
  be discarded.") appears first - nothing is silently lost.
- **Abort** - while a conversion is in flight, an **Abort** button appears on the processing
  overlay. Confirming ("Abort current conversion? Unfinished results will be discarded.") cancels
  the in-flight request via `AbortController` and returns cleanly to the Home screen - no partial
  or inconsistent state.
- **Workflow badges** - a slim status strip (✅ Converted, ✅ Description Applied, ✅ Ready to Save)
  gives an at-a-glance read of where you are in the workflow, shown once a conversion exists.
- **DESC immediately after PPID** - the Add Description column now displays (and exports) as
  `PPID | DESC | TS# | ...` instead of appended at the end.
- **Preview = Export** - the column order shown in the grid always matches exactly what
  Quick Save/Save As produce, including with a custom Transformation Rule active. Verified by a
  dedicated regression test, not just visual inspection.
- Data-dependent toolbar controls (Add Description, Quick Save, Save As, Preview Rows, Search,
  Transformation Rules) are hidden until there's a conversion result - the toolbar only ever shows
  actions that are actually possible right now.

### Productivity & User Experience (V1.06)
- **Add Description** - after converting, optionally upload a Description excel file (`PPID`,
  `DESC` columns) to automatically append a `DESC` column to every matching row, by `PPID`
  (left join - unmatched rows are left as `-`, existing converted data is never modified). Removes
  the manual VLOOKUP/XLOOKUP step. The Description file's `PPID` must be unique; a duplicate is
  rejected with a clear error rather than silently picking a winner.
- **Preview Rows** - choose how many rows the grid actually renders: 100 (default), 500, 1000,
  5000, or All. The full dataset is always available for search/save - this only controls render
  cost.
- **Search follows Preview Rows** - search always matches against the entire dataset (the match
  count is always accurate), but only renders up to the current Preview Rows setting of those
  matches, e.g. "342 matches - Showing first 100 rows".
- **Large Dataset Warning** - selecting Preview Rows = All shows a confirmation first (rendering/
  searching every row of a large dataset can be slow), with a "Don't show this warning again"
  option persisted locally.
- **Quick Save / Save As** - replaces the old single Download button. **Quick Save** downloads
  immediately with an auto-generated filename (`RCC_converted_YYMMDD_HHMMSS.xlsx`). **Save As**
  opens the OS-native save dialog (via the browser's File System Access API - Chromium-based
  browsers only; Firefox/Safari fall back to the same behavior as Quick Save, since neither
  implements that API). Note: no browser can reveal a saved file in the OS file explorer from a
  web page (no such API exists for a sandboxed page), so there is no "Open Folder" action after
  saving.
- **Status Bar** now shows Description match/unmatch counts once Add Description has run.

### Core conversion (V1.01+)
- **File upload or clipboard paste** - drag & drop / choose a file, or copy a range out of Excel
  (including the header row) and paste it directly.
- **Flexible input columns** - production files can carry extra columns; only `PPID` /
  `Parameter` / `Reference Value` are read (located by header name, with a positional fallback),
  everything else is ignored.
- **Unsupported parameters are ignored** - unrecognized `Parameter` values (and any `TS#` beyond
  `TS#10`) are silently skipped rather than raising an error or inventing new columns.
- **Security** - nothing is ever written to disk; upload/paste, transformation, and export all
  happen in memory for the duration of a single request. No database, no logging of excel
  contents.

### Transformation Rule Editor (V1.03)
- **Output column selection**, **drag & drop reordering**, and **column aliases** (display-only -
  internal field names, sorting, and filtering are unaffected).
- **Rule management** - save, update, delete, and switch between named rules, stored locally in
  your browser (no server-side database). **Import/Export** as portable JSON.
- **Default Rule** - auto-created, always available, reproduces the exact V1.02 output.
- **Live preview** - every rule edit updates the grid instantly, entirely client-side.
- **Excel-style preview grid** - built on AG Grid: sticky header, pinned first column,
  resizable/movable columns, virtual scrolling, natural sort, row numbers.

### Performance, Reliability & Observability (V1.05)
- **~8.6x faster at enterprise scale** - a 300,000-row excel file now converts in ~1.8s instead
  of ~15s. Driven by adopting `python-calamine` (Rust-based) as the default reader - validated
  byte-and-type-identical to the previous engines before being adopted, with an automatic
  fallback for anything outside that validation - and by no longer writing an unused xlsx file on
  every conversion (downloads go through a separate, on-demand endpoint). Full numbers and
  methodology: [PERFORMANCE_BENCHMARK_V1.05.md](./PERFORMANCE_BENCHMARK_V1.05.md).
- **Processing overlay** - shown immediately on Convert, with a stage indicator (Reading Excel →
  Parsing Workbook → Applying Transformation Rules → Generating Output → Preparing Preview), an
  indeterminate progress bar, and a rough time estimate. Upload/Convert are disabled and the
  dialog can't be dismissed mid-request, so a duplicate conversion can't be started by accident.
- **Stronger reliability** - a 250 MB upload size cap (closes an unbounded-memory risk), broader
  exception handling with user-friendly messages on every endpoint, and a global fallback handler
  so an unexpected error never leaks a raw traceback to the client.
- **Structured logging** (Application/Error/Performance/Debug categories) and an optional
  **Debug Mode** (Settings menu, off by default) that adds per-stage timing, peak memory, and
  which read engine was used to both the Status Bar and the raw API response.
- **Simplified default UI** - the Transformation Rule Editor now lives behind **Settings → Show
  Advanced Features** (off by default) rather than always being visible; the toolbar no longer
  hardcodes a version string; an **About** dialog (Settings menu) shows app/version/build info.
- **Real automated test suites** - `pytest` (backend, 88% line coverage) and `Vitest` (frontend).
  See [TEST_COVERAGE_V1.05.md](./TEST_COVERAGE_V1.05.md).

### Production Readiness (V1.04)
- **.xls and .xlsx (and .xlsm)** - both legacy and modern excel formats are accepted. The real
  format is auto-detected from the file's contents (not the filename extension), so a mislabeled
  file still works. The app always **exports** `.xlsx`, regardless of what was uploaded.
- **Polished upload experience** - drag states are visually distinct (accepting vs. rejecting a
  file as you hover it), and unsupported file types are rejected immediately with a plain-English
  reason instead of a failed request.
- **Calmer notifications** - successful actions (converted, saved, downloaded, ...) show as a
  quiet status-bar message; toasts are reserved for errors and warnings, and never cover the
  toolbar or search box.
- **One-click run/update** - see Quick Start above.
- **Framework warnings resolved at the root cause** - proper MUI/Next.js App Router SSR cache
  integration and a stable `dnd-kit` context id (see [Troubleshooting](#troubleshooting) for what
  this actually fixes and why).

## Developer Experience

| Script | Purpose |
|---|---|
| `run.bat` / `run.ps1` | Validates Python 3.12+/Node 18+, creates the backend venv and installs dependencies if missing, installs frontend packages if missing, starts both servers (each in its own window), and waits until both report healthy. |
| `update.bat` / `update.ps1` | Pulls the latest git changes (refuses to run over uncommitted changes) and reinstalls any changed dependencies. |
| `scripts\health-check.ps1` | Standalone check of whether both servers are currently responding - doesn't start or stop anything. |

All three are plain PowerShell (with a `.bat` double-click wrapper) - no extra tooling to install.

### Running the test suites

```bash
# Frontend (Vitest, 225 tests) - the only test suite that matters for this branch
cd frontend
npm test                                                            # or: npx vitest run --coverage
npm run lint
npx tsc --noEmit
```

Included in those 150: a dedicated `lib/converter/regression.test.ts` that loads real fixture
files and compares the JS engine's output field-for-field against a JSON snapshot produced by the
actual Python V1.09 engine - see [Architecture](#architecture) and
[CODE_REVIEW_V1.10.md](./CODE_REVIEW_V1.10.md) for how this is generated/verified.

The Python/`pytest` suite (67 tests) still exists and still passes unchanged - it belongs to the
preserved V1.09 backend (`backend/`), not to this branch's running app. See
`backend/scripts/dump_transform_json.py` if you need to regenerate the regression snapshots after
changing `backend/app/services/excel_transformer.py` on `release/v1.09`.

### Debug Mode

Toggle **Settings → Debug Mode** in the toolbar (off by default) to see per-stage timing, peak
memory, and which excel-reading engine was used, both in the Status Bar after a conversion and in
the raw API response (`?debug=true` on `/api/convert`/`/api/convert-text`).

### Running a performance benchmark

```bash
cd backend
# make_mock.py's PPID_COUNT constant defaults to 150; edit it (or pass a
# larger ppid_count to build_workbook() directly) to generate a bigger file
./.venv/Scripts/python.exe scripts/make_mock.py scripts/bench_300k.xlsx
./.venv/Scripts/python.exe scripts/benchmark.py scripts/bench_300k.xlsx --label my_run
```

Prints and saves timing/memory/throughput as `scripts/bench_result_<label>.json`. See
[PERFORMANCE_BENCHMARK_V1.05.md](./PERFORMANCE_BENCHMARK_V1.05.md) for the V1.04-vs-V1.05 results.

## Home Screen Guide

1. Launch the app - you land directly on the **Home** screen (no Upload click needed).
2. Either **drag & drop** a `.xls`/`.xlsx`/`.xlsm` file onto the Upload panel (or click it to
   browse), or click into the Paste panel and **Ctrl+V** a range copied from Excel. Using one
   clears the other, so there's never ambiguity about which input Convert will use. A large paste
   (~200,000+ rows) shows a "Clipboard Loaded" summary instead of the raw text - see
   [Troubleshooting](#troubleshooting).
3. Selected the wrong file, or pasted the wrong range? Click **Remove** (Upload) or **Clear**
   (Paste) to discard it and start over, without needing to convert or navigate away first.
4. Click **Convert**. A processing overlay shows progress; click **Abort** if you need to cancel
   (a confirmation appears before anything is actually discarded).
5. Once converted, you're on the Preview screen - the toolbar now shows Quick Save/Save As/Add
   Description/Preview Rows/Search, and workflow badges confirm what's been done.
6. Click **Home** (top-left) at any time to start over with a different file - if you have an
   active conversion, you'll be asked to confirm first. Home always returns the entire application
   to its initial state (V1.09) - nothing from the previous session (data, search, the active
   Transformation Rule, status messages) carries over.

## Rule Editor Guide

0. The Rule Editor is hidden by default (V1.05 simplifies the everyday UI) and only appears once
   you have a conversion result (V1.07). Open the **Settings**
   menu (top-right) and turn on **Show Advanced Features** to reveal the **Transformation Rules**
   toolbar button - nothing about the feature itself changed, it's just not shown until asked for.
1. Click **Transformation Rules** in the toolbar to open/close the rule panel (open by default).
2. Pick a rule from the dropdown at the top of the panel, or start from **Default**.
3. For each of the 9 columns: check/uncheck to include/exclude, drag the handle (⋮⋮) to reorder,
   type into the alias field to change its displayed/exported header.
4. The Preview grid and the row/column counts in the status bar update instantly as you edit.
5. **Save As** a new rule, **Update** the current one, **Delete** it, or **Reset to Default**.
6. **Export**/**Import** a rule as `.json` to share it with a teammate.
7. Click **Quick Save** or **Save As** in the toolbar at any time to export the excel file shaped
   exactly like the current preview (including a `DESC` column if Add Description has run) - the
   original upload is never needed again for this.

## Add Description Guide

1. After converting, click **Add Description** in the toolbar.
2. Upload a Description excel file with a `PPID` column and a `DESC` (or `Description`) column.
3. Every converted row whose `PPID` matches a row in the Description file gets that `DESC` value;
   rows sharing a `PPID` all receive the same `DESC`. Unmatched rows are left as `-`.
4. The grid immediately shows the new `DESC` column, and the Status Bar shows how many `PPID`s
   matched vs. didn't.
5. Re-running Add Description with a different file always re-merges against the original
   conversion (never stacks onto a previous merge) - so switching description files is safe.
6. `DESC` rides along on **Quick Save**/**Save As** regardless of which Transformation Rule is
   active, since it isn't part of the rule-shapeable column set.

## Architecture

```
User -> Browser -> JavaScript/TypeScript (frontend/lib/converter/)
                      - Excel Read (SheetJS, + a native DOMParser path for
                        the "HTML table saved as .xls" case)
                      - Transform / Rule shaping / Add Description merge
                      - Excel Export (SheetJS)
                    -> runs inside a Web Worker (worker.ts) -> Download
```

Every V1.09 endpoint has a direct client-side equivalent in `frontend/lib/converter/`:

| V1.09 (FastAPI) | V1.10 (Browser Edition) |
|---|---|
| `services/excel_transformer.py` | `lib/converter/transformer.ts` |
| `services/rule_manager.py` | `lib/converter/ruleManager.ts` |
| `services/description_merger.py` | `lib/converter/descriptionMerger.ts` |
| `utils/excel_io.py` | `lib/converter/excelIO.ts` (SheetJS instead of calamine/openpyxl/xlrd) |
| `POST /api/convert`, `/convert-text`, `/export`, `/add-description` | `lib/converter/engine.ts`, called via `lib/converter/worker.ts` |

`lib/api.ts` keeps the exact same function signatures it had in V1.09 (`convertFile`,
`convertText`, `exportRows`, `addDescription`, plus the new `addDescriptionFromClipboard`) - every
component that called it (HomeScreen, AddDescriptionDialog, page.tsx, ...) needed no changes
beyond what V1.10 explicitly adds. The Worker exists for two reasons: it lets Abort actually
terminate an in-progress computation (impossible on a synchronous main thread), and it keeps the
UI responsive while parsing large files - not for raw throughput (see
[Performance philosophy](#deployment-github-pages) below).

## Deployment (GitHub Pages)

Pushing to `browser-edition` (paths under `frontend/**`) triggers
[`.github/workflows/deploy-pages.yml`](./.github/workflows/deploy-pages.yml): type-check, lint,
test, `next build` (static export via `output: "export"` in `next.config.mjs`), then publish
`frontend/out/` to GitHub Pages. `next dev` is unaffected by `output: "export"`, so local
development works exactly as before.

**Performance philosophy (per this version's own spec): don't optimize prematurely.** SheetJS
parsing in the browser is not as fast as the V1.09 backend's `python-calamine` reader at very
large scale, and this is a known, disclosed trade-off - not yet measured against real usage, and
not addressed speculatively. Once this branch is deployed and used with real datasets (1k/10k/
50k/100k rows), any actual bottleneck found is the one worth fixing.

## Reporting a Problem

Click **Help & Support** in the toolbar (always available) for the **User Guide**, **FAQ**,
**Troubleshooting**, and **Error Details** - see
[`frontend/public/docs/`](./frontend/public/docs/) for the actual content (plain Markdown,
editable on GitHub without touching any application code).

If something unexpected happens (a genuine bug, not a validation message like "File is too
large"), a **Show Details** action appears next to the error - whether it's a full-page crash
(`ErrorBoundary`'s recovery screen, historically called "Show Log") or an everyday failed
Convert/Add Description (V1.11). That opens a plain-text log (timestamp, app version, operation,
error message/stack trace, browser/OS info) with a **Copy Log** button - paste it into your bug
report along with what you were doing. The log never includes any converted data (PPID/TS#/DESC/
excel content) - only technical/environment details. **Show Details is intentionally not offered
for a validation error whose message already reflects your own data** (e.g. "Description file has
duplicate PPID(s): ...") - the on-screen message already contains everything a copyable log would,
so nothing is withheld, only avoided as a redundant second copy of the same data (see
[CODE_REVIEW_V1.11.md](./CODE_REVIEW_V1.11.md)). A developer contact (`jong10k.kim`) is shown in
the same dialog and in Help & Support's Error Details tab.

## Release Notes

Click **Release Notes** in the toolbar (always available, including from the Home screen) for an
in-app changelog - every version's New / Improved / Fixed / Known Issues, most recent expanded
first. This is the primary place future updates are communicated; see
[`frontend/lib/releaseNotes.ts`](./frontend/lib/releaseNotes.ts) if you're adding an entry for a
new version.

## Rule JSON Specification

```json
{
  "rule_name": "Engineering",
  "output_columns": ["PPID", "TS#", "FilmMaterial", "CardName"],
  "column_order": ["PPID", "FilmMaterial", "CardName", "TS#"],
  "aliases": {
    "PPID": "Recipe Name",
    "CardName": "Card"
  }
}
```

| Field | Type | Meaning |
|---|---|---|
| `rule_name` | string | Display name for the rule. |
| `output_columns` | string[] | Which internal columns are **enabled** (a set - order doesn't matter here). Valid values: `PPID`, `TS#`, `CardName`, `FilmMaterial`, `CorrelationCard_1`, `CorrelationCard_2`, `CorrelationCard_3`, `DataCombination`, `DataFeedFoward`. |
| `column_order` | string[] | Final display/export **order**. Only entries also present in `output_columns` are shown; a column in `output_columns` but missing from `column_order` is appended at the end. |
| `aliases` | object | `internal_name -> display_header`. Only affects the header text shown/exported - never the internal field name. |

Validation is defensive, never throws: unknown column names anywhere in a rule are silently
dropped; a rule that ends up with zero enabled columns falls back to the full column set. More
examples: [`examples/rules/`](./examples/rules/).

## Installation

Requirements: Python 3.12+, Node.js 18+. (Or just run `run.bat` - see Quick Start.)

```bash
# Backend
cd backend
python -m venv .venv
./.venv/Scripts/pip install -r requirements.txt      # Windows
# source .venv/bin/activate && pip install -r requirements.txt   # macOS/Linux

# Frontend
cd ../frontend
npm install
```

## Run

```bash
# Backend - http://localhost:8000
cd backend
./.venv/Scripts/python.exe -m uvicorn app.main:app --port 8000 --host 127.0.0.1

# Frontend - http://localhost:3000
cd frontend
npm run dev
```

### Generating sample data

```bash
cd backend
./.venv/Scripts/python.exe scripts/make_mock.py scripts/mock_input.xlsx   # modern format
./.venv/Scripts/python.exe scripts/make_mock.py scripts/mock_input.xls    # legacy format (needs: pip install -r requirements-dev.txt)
```

Both produce the same production-like mock data (many PPIDs, variable TS block counts, extra
unrelated columns, unsupported parameters mixed in) in their respective formats.

## Troubleshooting

**`run.bat` closes immediately / says Python or Node not found.**
Install Python 3.12+ and Node.js 18+ and make sure both are on your `PATH` (reopen the terminal
after installing), then run `run.bat` again.

**A server window opened but shows an error and closed.**
Read the error in that window - it's the actual uvicorn/Next.js output. Common causes: port 8000
or 3000 already in use by another process (close it, or stop the other process), or a corrupted
`node_modules`/`.venv` (delete the folder and run `update.bat`).

**Upload says "isn't a supported file type."**
Only `.xls`, `.xlsx`, and `.xlsm` are accepted. If your file genuinely is one of these but still
gets rejected, it may be corrupted or password-protected - the app detects format from file
contents, not the extension, so a real format problem will surface as a clear "Could not read
uploaded file" error after upload rather than a silent failure.

**Nothing happens after clicking Convert / the grid stays empty.**
Check the backend window for a Python traceback, and confirm `scripts\health-check.ps1` reports
both servers healthy. If the input file doesn't contain any `TS#<n>_<field>` parameters under a
`PPID` row, conversion intentionally produces zero rows and reports an error rather than an empty
success.

**I see a console warning about hydration or dnd-kit on first load.**
This was root-caused and fixed in V1.04 (MUI's `AppRouterCacheProvider` + a stable `DndContext`
id). If you still see one, please report it with the exact message - it would indicate a
regression, not an expected/ignorable warning.

**Upload says "File is too large."**
Files over 250 MB are rejected before any parsing is attempted (V1.05 reliability hardening,
prevents an unbounded-memory request). This app's target scale is ~300k rows, which is typically
well under this limit - if you're hitting it, double check the file is what you think it is.

**I can't find the Transformation Rules button.**
It's hidden by default in V1.05 - see step 0 of the [Rule Editor Guide](#rule-editor-guide).

**Add Description says the file is missing required columns, or has a duplicate PPID.**
The Description file needs a `PPID` column and a `DESC` (or `Description`) column, matched by
header name regardless of position. `PPID` must be unique in the Description file - if it isn't,
the error message lists which `PPID`s repeat so you can fix the source file.

**I clicked Abort but the backend window still looks busy for a moment.**
Abort cancels the browser's request immediately (the UI returns to Home right away, and the
in-flight response is discarded when it eventually arrives) - it does not interrupt the backend's
in-progress computation, which keeps running to completion server-side and simply has its result
ignored. At this app's target scale (sub-2s conversions, per the V1.05 benchmark) this is not
user-visible; a real server-side cancellation mechanism remains a disclosed future item (see
[CODE_REVIEW_V1.09.md](./CODE_REVIEW_V1.09.md)'s Future Improvements).

**I accidentally selected the wrong file or pasted the wrong data.**
Click **Remove** (next to the selected file) or **Clear** (next to the Clipboard Loaded summary)
to discard it before converting - see step 3 of the [Home Screen Guide](#home-screen-guide). The
same applies to the Description file in the Add Description dialog.

**Clicking Home doesn't seem to fully reset things.**
This was a real bug, fixed in V1.09 - Home now resets the uploaded file/pasted data, preview,
search, Add Description result, status badges, status bar message, and the active Transformation
Rule together. If you still see something carry over after a Home reset on the current version,
please report it via the [Error Log Viewer](#reporting-a-problem) if an error dialog appeared, or
otherwise as a plain bug report - this would be a regression.

**Pasting a very large range (~200,000+ rows) shows a summary instead of the pasted text.**
This is intentional (V1.08) - pasting that much text directly into a rendered textarea used to
freeze the browser. The summary ("Clipboard Loaded / Rows / Columns / Status: Ready to Convert")
confirms the paste was captured correctly; click **Clear** to paste something else, or **Convert**
to proceed with the full pasted data (it's kept in memory, just not rendered).

**A large file takes a while to convert, or Abort doesn't stop it instantly (V1.10).**
Conversion runs in a Web Worker, so the tab itself never freezes regardless of file size - but a
very large file (~100,000+ rows) genuinely takes longer to parse in the browser than the V1.09
backend's `python-calamine` reader did server-side. This is a known, disclosed trade-off (see
[CODE_REVIEW_V1.10.md](./CODE_REVIEW_V1.10.md)), not yet optimized per this version's "measure
before optimizing" principle. Abort does stop the computation as soon as the worker receives the
termination signal - there can be a brief delay if it's mid-way through a single large parsing
call.

**Save As doesn't open a native folder picker.**
The OS-native Save dialog uses the browser's File System Access API, which only Chromium-based
browsers (Chrome, Edge) implement. On Firefox/Safari, Save As falls back to the same behavior as
Quick Save (an immediate download to your browser's configured download location) - this is a
browser capability gap, not a bug. There is also no "Open Folder" button after saving, for the
same reason: no browser exposes an API for a web page to open the OS file explorer.

## Folder structure

```
excel-automation-v1.01/
├── .github/workflows/deploy-pages.yml  # V1.10: type-check/lint/test -> static export -> GitHub Pages
├── run.ps1 / run.bat         # One-click start for the V1.09 Python/FastAPI backend (unaffected by V1.10)
├── update.ps1 / update.bat   # One-click update (git pull + reinstall)
├── scripts/health-check.ps1  # Standalone health check (V1.09 backend)
├── examples/rules/           # Example rule JSON files
├── PERFORMANCE_BENCHMARK_V1.05.md  # V1.04 vs V1.05 methodology + results
├── TEST_COVERAGE_V1.05.md          # Backend/frontend coverage breakdown
├── CODE_REVIEW_V1.05.md            # Architecture/performance/reliability/... review + score
├── CODE_REVIEW_V1.06.md            # V1.06 review + score (Add Description, Preview Rows, Save UX)
├── CODE_REVIEW_V1.07.md            # V1.07 review + score (Home screen, Abort, DESC placement, Preview=Export)
├── CODE_REVIEW_V1.08.md            # V1.08 review + score (stabilization: refactoring, reliability, perf, deps)
├── PERFORMANCE_REPORT_V1.08.md     # Large-paste freeze root cause/fix + pipeline profiling
├── DEPENDENCY_AUDIT_V1.08.md       # Missing/unused dependency findings incl. the psutil clean-install bug
├── TEST_COVERAGE_V1.08.md          # Backend/frontend coverage breakdown
├── CODE_REVIEW_V1.09.md            # V1.09 review + score (Home reset fix, Remove/Clear, Error Log, Release Notes)
├── CODE_REVIEW_V1.10.md            # V1.10 review + score (Browser Edition migration, JS/Python parity regression)
├── CODE_REVIEW_V1.11.md            # V1.11 review + score (Help & Support, Error Details privacy gating)
├── CODE_REVIEW_V1.12.md            # V1.12 review + score (Film Material Visualization, Longest Match First parsing)
├── backend/                        # Preserved V1.09 Python/FastAPI implementation - not used by this branch's
│                                    # running app; kept only as the source of truth for the regression fixtures
│                                    # in frontend/lib/converter/__fixtures__/ (see Architecture above)
│   ├── app/
│   │   ├── main.py                    # FastAPI app entry, CORS, logging setup, global exception handler
│   │   ├── api/
│   │   │   ├── routes.py              # HTTP layer only - calls into services/; upload size limit, Debug Mode
│   │   │   └── error_handling.py      # V1.08: shared two-tier route exception-handling policy
│   │   ├── services/
│   │   │   ├── excel_transformer.py   # Core conversion logic (unchanged since V1.02) + summary stats
│   │   │   ├── rule_manager.py        # Validates/applies a TransformationRule (column select/order/alias)
│   │   │   └── description_merger.py  # V1.06: left-joins a DESC column onto converted rows by PPID
│   │   ├── models/
│   │   │   ├── constants.py           # OUTPUT_COLUMNS etc. - the fixed internal column set
│   │   │   └── schemas.py             # Pydantic request/response models incl. TransformationRule, DebugInfo
│   │   └── utils/
│   │       ├── excel_io.py            # In-memory excel read/write; calamine-first w/ openpyxl/xlrd fallback
│   │       ├── logging_config.py      # Structured (Application/Error/Performance/Debug) logging setup
│   │       ├── perf.py                # PeakMemorySampler - shared by Debug Mode and the benchmark script
│   │       └── df_helpers.py          # V1.08: shared column-placement helpers (find_insert_position, insert_column_after)
│   ├── scripts/
│   │   ├── make_mock.py               # Production-like mock data generator (.xlsx and .xls)
│   │   └── benchmark.py               # Performance benchmark harness (timing + peak memory + throughput)
│   ├── tests/                         # pytest suite (run: pytest, from backend/) - 67 tests
│   ├── requirements.txt
│   └── requirements-dev.txt           # xlwt (mock .xls fixtures), pytest, pytest-cov, httpx (TestClient)
└── frontend/
    ├── app/
    │   ├── page.tsx                   # Toolbar / Home-or-(Rule Editor + Grid) / status bar / session state
    │   ├── layout.tsx                 # MUI SSR cache provider (AppRouterCacheProvider) + providers
    │   └── globals.css
    ├── components/
    │   ├── AppProviders.tsx           # MUI theme + Sonner toaster + ErrorBoundary wrapper
    │   ├── ErrorBoundary.tsx          # Top-level UI recovery after an unexpected render error; V1.09: Show Log
    │   ├── ErrorLogDialog.tsx         # V1.09: timestamp/version/operation/message/stack/env + Copy Log + dev contact
    │   ├── ReleaseNotesDialog.tsx     # V1.09: New/Improved/Fixed/Known Issues per version
    │   ├── HelpSupportDialog.tsx      # V1.11: User Guide / FAQ / Troubleshooting / Error Details, tabbed
    │   ├── MarkdownDoc.tsx            # V1.11: fetches + renders a public/docs/*.md file with MUI-styled components
    │   ├── AppToolbar.tsx             # Home / Release Notes / Help & Support / Quick Save / Save As / Add Description / Preview Rows / Search / Settings
    │   ├── StatusBar.tsx              # Rows/Columns/matches/Rule + Description stats + completion feedback + Debug metrics
    │   ├── WorkflowBadges.tsx         # V1.07: Converted / Description Applied / Ready to Save status strip
    │   ├── ProcessingOverlay.tsx      # Shown on Convert/Add Description: stage text, indeterminate progress, ETA, Abort
    │   ├── AboutDialog.tsx            # App name/version/git tag/build date/edition
    │   ├── HomeScreen.tsx             # Application entry point - drag & drop / paste / Convert; V1.11: Show Details on failure
    │   ├── AddDescriptionDialog.tsx   # V1.06: uploads a Description file, merges DESC by PPID; V1.11: Show Details on failure
    │   ├── LargeDatasetWarningDialog.tsx  # V1.06: confirm before Preview Rows = All
    │   ├── ReturnHomeDialog.tsx       # V1.07: confirm before discarding an active session via Home
    │   ├── AbortConfirmDialog.tsx     # V1.07: confirm before cancelling an in-flight conversion
    │   ├── RuleEditor.tsx             # Column select/reorder (dnd-kit)/alias/save/update/delete/import/export
    │   ├── ExcelGrid.tsx              # AG Grid preview - renders whatever rows/columns it's given (caller filters/slices);
    │   │                              #   V1.12: filmmaterial cells get a pointer cursor + onFilmMaterialClick wiring
    │   └── FilmMaterialVisualizationDialog.tsx  # V1.12: TOP->BOTTOM layer modal, Material DB colors, error states
    ├── public/docs/                  # V1.11: Help & Support content - plain Markdown, editable on GitHub,
    │   ├── USER_GUIDE.md              #   no React/TypeScript involved, served as-is by the static export
    │   ├── FAQ.md                     #   (## headings become individual FAQ accordion entries - lib/faqParser.ts)
    │   └── TROUBLESHOOTING.md
    ├── public/data/material-db.csv    # V1.12: administrator-editable Material Code -> Color mapping (CSV, 2 columns)
    ├── lib/
    │   ├── api.ts                     # V1.10: local-engine client (was a FastAPI fetch client through V1.09) - same public interface
    │   ├── docsLoader.ts              # V1.11: fetches a public/docs/*.md file, basePath-aware
    │   ├── faqParser.ts               # V1.11: splits FAQ.md's ## headings into individual Q&A entries
    │   ├── materialDb.ts              # V1.12: fetches/parses/validates material-db.csv, cached (no reload button needed)
    │   ├── filmMaterialParser.ts      # V1.12: Longest Match First tokenizer + TOP->BOTTOM/explicit-Si-bottom logic
    │   ├── cssColor.ts                # V1.12: HEX/CSS-name color validation + black/white contrast text picker
    │   ├── converter/                 # V1.10: the local conversion engine - see Architecture above
    │   │   ├── constants.ts           # Port of backend/app/models/constants.py
    │   │   ├── transformer.ts         # Port of backend/app/services/excel_transformer.py
    │   │   ├── ruleManager.ts         # Port of backend/app/services/rule_manager.py
    │   │   ├── descriptionMerger.ts   # Port of backend/app/services/description_merger.py
    │   │   ├── dfHelpers.ts           # Port of backend/app/utils/df_helpers.py
    │   │   ├── excelIO.ts             # Port of backend/app/utils/excel_io.py (SheetJS + DOMParser instead of pandas)
    │   │   ├── engine.ts              # Orchestrates the above into convertFile/convertText/exportRows/addDescription*
    │   │   ├── worker.ts              # Web Worker entry point - runs engine.ts off the main thread (real Abort);
    │   │   │                          #   V1.11: tags a caught error's isValidationError for privacy-safe log gating
    │   │   ├── workerClient.ts        # Main-thread RPC client for worker.ts, used by lib/api.ts
    │   │   ├── regression.test.ts     # V1.09 (Python) vs V1.10 (JS) field-for-field parity, real fixture files
    │   │   └── __fixtures__/          # Real .xls/.xlsx files + Python-generated *.expected.json snapshots
    │   ├── naturalCompare.ts          # Shared natural-sort comparator (used by AG Grid column sort)
    │   ├── rules.ts                   # TransformationRule type, localStorage persistence, shaping helpers
    │   ├── uploadValidation.ts        # Pure file-rejection-message logic (extracted for testability)
    │   ├── searchFilter.ts            # V1.06: pure row-search predicate (search always runs on the full dataset)
    │   ├── filename.ts                # V1.06: default save filename (RCC_converted_YYMMDD_HHMMSS.xlsx)
    │   ├── pasteSummary.ts            # V1.08: lightweight row/column summary for a large paste, never renders the raw text
    │   ├── errorLog.ts                # V1.09: builds/formats the Error Log Viewer's plain-text log entry; V1.11: toError() helper
    │   ├── releaseNotes.ts            # V1.09: Release Notes content - add one entry here per future version
    │   └── version.ts                 # FRONTEND_VERSION/GIT_TAG/BUILD_DATE/EDITION for the About dialog
    ├── types/file-system-access.d.ts  # V1.06: ambient types for showSaveFilePicker (Save As)
    ├── eslint.config.mjs              # V1.08: flat ESLint config (next/core-web-vitals + next/typescript)
    ├── next.config.mjs                # V1.10: output: "export" + basePath for GitHub Pages; V1.11: NEXT_PUBLIC_BASE_PATH for docsLoader.ts
    └── vitest.config.mts, vitest.setup.ts  # Vitest suite (run: npm test) - 225 tests
```

Architecture: **Frontend → API → Rule Manager → Transformation Engine → Excel Export.**
`services/excel_transformer.py` (the transformation engine) has not changed since V1.02 and knows
nothing about rules or input formats; `services/rule_manager.py` only reshapes its output
afterward, and `utils/excel_io.py` only decides how to *read* the input. This keeps the three
concerns independent and separately testable.

## Version history

- **V1.01** - Initial release. Upload/paste → convert → preview → download.
- **V1.02** - `TS#` output format, flexible input columns, client-side search/sort, resizable
  columns, conversion summary panel.
- **V1.03** - Transformation Rule Editor: configurable output columns, ordering, and aliases;
  rule save/update/delete/import/export; live preview; AG Grid-based Excel-style UI.
- **V1.04** - Production readiness: .xls support with auto-detection, one-click run/update
  scripts, upload UX polish, calmer status-bar notifications, root-caused framework warnings,
  code-quality pass. See [CODE_REVIEW_V1.04.md](./CODE_REVIEW_V1.04.md) for the full assessment.
- **V1.04.1** - Patch: fixed `.xls` files that are actually HTML tables (a common ERP/MES export
  pattern) being rejected outright; fixed zebra striping/row hover/selected highlighting not
  rendering (the AG Grid theme never wired them up); Status Bar now shows an idle "Ready" state;
  added a real `pytest` suite under `backend/tests/`.
- **V1.05** - Performance, reliability, and observability: ~8.6x faster at 300k-row scale
  (calamine reader + eliminated a wasted xlsx write), a Processing Overlay with stages/progress/
  ETA, a 250 MB upload cap, structured logging + optional Debug Mode, `pytest`/`Vitest` test
  suites, and a simplified default UI (Rule Editor moved behind Settings → Advanced, About
  dialog, no hardcoded version). See [CODE_REVIEW_V1.05.md](./CODE_REVIEW_V1.05.md),
  [PERFORMANCE_BENCHMARK_V1.05.md](./PERFORMANCE_BENCHMARK_V1.05.md), and
  [CHANGELOG.md](./CHANGELOG.md).
- **V1.06** - Productivity & UX: Add Description (PPID-based DESC auto-merge, replacing manual
  VLOOKUP/XLOOKUP), Preview Rows (100/500/1000/5000/All) with search that always matches the full
  dataset, a Large Dataset Warning before rendering everything, and Quick Save/Save As (replacing
  Download) with an auto-generated timestamped filename. See
  [CODE_REVIEW_V1.06.md](./CODE_REVIEW_V1.06.md) and [CHANGELOG.md](./CHANGELOG.md).
- **V1.07** - Desktop-quality UX: a dedicated Home screen (drag & drop / paste / Convert, no
  Upload click needed) replacing the modal upload dialog, Home navigation with a discard
  confirmation, Abort for in-flight conversions, workflow status badges, DESC repositioned
  immediately after PPID, and a guaranteed Preview = Export column-order match. See
  [CODE_REVIEW_V1.07.md](./CODE_REVIEW_V1.07.md) and [CHANGELOG.md](./CHANGELOG.md).
- **V1.08** - Production readiness & stability, no new functionality by design: fixed the
  large-paste browser freeze at its root cause, found and fixed a `psutil` dependency gap that
  would have broken a genuinely clean install, deduplicated DESC-placement and route
  exception-handling logic, added a top-level error boundary, configured ESLint for the first
  time, and expanded test coverage (backend 88% → 94%). See
  [CODE_REVIEW_V1.08.md](./CODE_REVIEW_V1.08.md) (scored **A**),
  [PERFORMANCE_REPORT_V1.08.md](./PERFORMANCE_REPORT_V1.08.md),
  [DEPENDENCY_AUDIT_V1.08.md](./DEPENDENCY_AUDIT_V1.08.md), and [CHANGELOG.md](./CHANGELOG.md).
- **V1.09** - Support & usability: renamed to RCC Excel Automation; fixed a real bug where Home
  didn't fully reset the session (the active Transformation Rule and status message could carry
  over); added Remove/Clear for an accidental upload or paste before converting; added an Error
  Log Viewer (Show Log / Copy Log / developer contact) for unexpected errors; added an in-app
  Release Notes page. See [CODE_REVIEW_V1.09.md](./CODE_REVIEW_V1.09.md) and
  [CHANGELOG.md](./CHANGELOG.md).
- **V1.10** - Browser Edition: the entire conversion pipeline ported to JavaScript/TypeScript and
  moved into a Web Worker, running fully client-side with no backend; deployed as a static site to
  GitHub Pages via GitHub Actions; Add Description gained Clipboard Paste support (closing a real
  V1.09 gap); Abort now genuinely cancels an in-progress conversion. The V1.09 Python/FastAPI
  implementation is preserved unchanged on `release/v1.09`. See
  [CODE_REVIEW_V1.10.md](./CODE_REVIEW_V1.10.md) and [CHANGELOG.md](./CHANGELOG.md).
- **V1.11** - User Guide & Support: a **Help & Support** dialog (User Guide, FAQ, Troubleshooting,
  Error Details) sourced from editable Markdown under `frontend/public/docs/`; **Show Details**
  extended to everyday Convert/Add Description failures, not just full-page crashes, with a
  privacy gate that withholds it for validation errors whose message already reflects the user's
  own data. No conversion logic changed. See [CODE_REVIEW_V1.11.md](./CODE_REVIEW_V1.11.md) and
  [CHANGELOG.md](./CHANGELOG.md).
- **V1.12 (this branch)** - Film Material Visualization: click a `filmmaterial` value to see its
  layer structure TOP to BOTTOM, colored per an administrator-editable
  [`material-db.csv`](./frontend/public/data/material-db.csv) with automatic black/white text
  contrast. Parsing uses Longest Match First against the Material DB, correctly tokenizing
  multi-character Material Codes; an unrecognized code shows a clear error instead of an incorrect
  diagram. Fully isolated from Excel conversion - a Material DB problem disables Visualization
  only. See [CODE_REVIEW_V1.12.md](./CODE_REVIEW_V1.12.md) and [CHANGELOG.md](./CHANGELOG.md).

## Backward compatibility

Selecting the **Default Rule** (auto-created, always present) produces exactly the same output
as V1.02 - same columns, same order, no aliases - for both `.xlsx` and `.xls` input, at both
everyday and 300k-row scale. This is verified by an automated regression test that:

1. Confirms `rule_manager.py` and `constants.py` are byte-identical to the `v1.04.1` git tag, and
   `excel_transformer.py`'s only change since `v1.04.1` is the documented columnar-construction
   performance refactor (diffed and reviewed, not just asserted).
2. Runs the V1.01-tag code against the same mock dataset used since V1.02, and diffs it against
   the current transformer's output.
3. Applies the Default Rule to a fresh conversion (including at 300k-row scale) and asserts the
   shaped result equals the unshaped output exactly.
4. Confirms `.xls`, `.xlsx`, and HTML-masquerading-as-`.xls` versions of the same mock dataset
   transform to byte-identical output, both directly and through a live HTTP `/api/convert` call -
   now also covering `python-calamine` (the new default reader) against openpyxl/xlrd.
5. Round-trips a real HTTP request: `/api/convert`'s returned data vs. re-exporting those same
   rows through `/api/export` with the Default Rule - byte-identical spreadsheets.

All checks passed on both the original 150-PPID / 814-row mock dataset and a 8,500-PPID /
300,474-row (46,586 output row) dataset. No existing V1.01-V1.04.1 functionality was removed -
the Rule Editor moving behind an Advanced toggle is a default-visibility change, not a removal.

**V1.06**: `excel_transformer.py` and `constants.py` remain byte-identical to the `v1.05` git tag
(the Add Description feature is a separate, additive merge step that only runs after conversion
and never touches the transformation engine) - confirmed by diff, not just assertion. The plain
convert → download flow (no Add Description, default Preview Rows) is unchanged; Add Description
and the save-flow rename are purely additive.

**V1.07**: `excel_transformer.py`, `constants.py`, and `rule_manager.py` remain byte-identical to
the `v1.06` git tag (confirmed by diff) - V1.07 is scoped to UX only, per its own spec, and the
conversion/rule-shaping engines were not touched. The DESC column's *position* changed (now
immediately after PPID, was previously appended at the end) - this is an explicitly requested
behavior change for V1.07, not a regression; DESC's *values* and the underlying conversion output
are otherwise identical.

**V1.08**: `excel_transformer.py`, `constants.py`, and `rule_manager.py` remain byte-identical to
the `v1.07` git tag (confirmed by diff). The two internal refactors this version touched
(DESC-placement logic, route exception handling) were each verified behavior-preserving by running
the full test suite before and after, plus a live end-to-end smoke test confirming
`PPID | DESC | TS# | ...` ordering is unchanged. No output-affecting behavior changed this version
by design - V1.08 is explicitly scoped to stabilization, not features.

**V1.09**: `excel_transformer.py`, `constants.py`, `rule_manager.py`, and every other backend
service file remain byte-identical to the `v1.08` git tag (confirmed by diff) - the only backend
change this version is a 2-line branding string in `main.py`. No conversion output changed. The
Home-reset fix and Remove/Clear additions are frontend-only session-state changes, verified by a
new `frontend/app/page.test.tsx` regression test that specifically reproduces the fixed bug
(customize a rule, reset via Home, reconvert, assert the rule is back to Default).

**V1.10 (Browser Edition)**: this branch doesn't modify the V1.09 backend at all - it's a
different implementation of the same behavior, not a change to the original. "Backward
compatibility" here means the new JS/TS engine produces the same output as the Python engine it
replaces, verified directly (not assumed): `frontend/lib/converter/regression.test.ts` runs three
real fixture files (`.xlsx`, `.xls`, and a genuine Excel-COM-saved `.xls` - the same files
`backend/tests/` has used since V1.04.1) through the JS engine and asserts every row, every
column, and every field value matches a JSON snapshot generated directly from the Python
`ExcelTransformer` (`backend/scripts/dump_transform_json.py`), field-for-field, not just spot
checks. `lib/rules.ts`, `lib/filename.ts`, and every UI component not explicitly listed as changed
in the V1.10 feature list above are byte-identical to `release/v1.09` - reused, not rewritten.

**V1.11 (User Guide & Support)**: none of `frontend/lib/converter/` (the ported conversion engine)
changed this version except `worker.ts`/`workerClient.ts`/`api.ts`'s error-reporting plumbing
(propagating `isValidationError` - see CODE_REVIEW_V1.11.md's Architecture section), and two
`InvalidExcelFormatError` classes gaining an explicit `.name` (no behavior change - existing
`instanceof` checks and thrown messages are unaffected, confirmed by the full V1.10 test suite,
including the Python-vs-JS regression suite, passing unmodified). `HomeScreen.tsx`'s and
`AddDescriptionDialog.tsx`'s Convert/Merge logic itself is unchanged; only their `catch` blocks
gained a conditional "Show Details" trigger.

**V1.12 (Film Material Visualization)**: `frontend/lib/converter/` (the conversion/rule/merge
engine) was not touched at all this version - Film Material Visualization only *reads* an
already-converted row's `FilmMaterial` value on click, via new, entirely separate modules
(`materialDb.ts`, `filmMaterialParser.ts`, `cssColor.ts`) with no import relationship to
`lib/converter/` in either direction. The one existing file touched for wiring is `ExcelGrid.tsx`
(a new optional `onFilmMaterialClick` prop, defaulting to no-op when omitted - confirmed by a test
that the grid doesn't throw or behave differently without it) and `app/page.tsx` (new dialog state,
additive). The full pre-V1.12 test suite (180 tests) passes unmodified; Excel conversion, Add
Description, and Help & Support were all re-verified working after this version's changes.
