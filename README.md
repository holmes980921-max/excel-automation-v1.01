# Excel Automation

A local, configurable Excel transformation tool. It converts a PPID / Parameter / Reference
Value excel export into a flat table - one row per `TS#` block - and lets you customize which
columns appear, in what order, and under what display name, entirely through the UI (no code
changes required).

**Current version: V1.07** (see the in-app **About** dialog, under the Settings menu, for the
live version/build info - the header intentionally no longer hardcodes a version string)

## Quick Start (Windows)

```
1. Double-click run.bat
2. Wait for "Excel Automation is running"
3. Open http://localhost:3000
```

`run.bat`/`run.ps1` checks your Python/Node versions, creates the backend virtual environment
and installs dependencies if missing, and starts both servers (each in its own window) - no
manual setup required. See [Developer Experience](#developer-experience) below for details, and
[Troubleshooting](#troubleshooting) if something doesn't come up.

## Features

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
# Backend (pytest, 55 tests)
cd backend
./.venv/Scripts/pip install -r requirements-dev.txt
./.venv/Scripts/python.exe -m pytest                              # or: pytest --cov=app --cov-report=term-missing

# Frontend (Vitest, 52 tests)
cd frontend
npm test                                                            # or: npx vitest run --coverage
```

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
   clears the other, so there's never ambiguity about which input Convert will use.
3. Click **Convert**. A processing overlay shows progress; click **Abort** if you need to cancel
   (a confirmation appears before anything is actually discarded).
4. Once converted, you're on the Preview screen - the toolbar now shows Quick Save/Save As/Add
   Description/Preview Rows/Search, and workflow badges confirm what's been done.
5. Click **Home** (top-left) at any time to start over with a different file - if you have an
   active conversion, you'll be asked to confirm first.

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
user-visible; genuinely interrupting server-side work is reserved for V1.08 (reliability).

**Save As doesn't open a native folder picker.**
The OS-native Save dialog uses the browser's File System Access API, which only Chromium-based
browsers (Chrome, Edge) implement. On Firefox/Safari, Save As falls back to the same behavior as
Quick Save (an immediate download to your browser's configured download location) - this is a
browser capability gap, not a bug. There is also no "Open Folder" button after saving, for the
same reason: no browser exposes an API for a web page to open the OS file explorer.

## Folder structure

```
excel-automation-v1.01/
├── run.ps1 / run.bat         # One-click start (env check + install + launch + health check)
├── update.ps1 / update.bat   # One-click update (git pull + reinstall)
├── scripts/health-check.ps1  # Standalone health check
├── examples/rules/           # Example rule JSON files
├── PERFORMANCE_BENCHMARK_V1.05.md  # V1.04 vs V1.05 methodology + results
├── TEST_COVERAGE_V1.05.md          # Backend/frontend coverage breakdown
├── CODE_REVIEW_V1.05.md            # Architecture/performance/reliability/... review + score
├── CODE_REVIEW_V1.06.md            # V1.06 review + score (Add Description, Preview Rows, Save UX)
├── CODE_REVIEW_V1.07.md            # V1.07 review + score (Home screen, Abort, DESC placement, Preview=Export)
├── backend/
│   ├── app/
│   │   ├── main.py                    # FastAPI app entry, CORS, logging setup, global exception handler
│   │   ├── api/routes.py              # HTTP layer only - calls into services/; upload size limit, Debug Mode
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
│   │       └── perf.py                # PeakMemorySampler - shared by Debug Mode and the benchmark script
│   ├── scripts/
│   │   ├── make_mock.py               # Production-like mock data generator (.xlsx and .xls)
│   │   └── benchmark.py               # Performance benchmark harness (timing + peak memory + throughput)
│   ├── tests/                         # pytest suite (run: pytest, from backend/) - 55 tests
│   ├── requirements.txt
│   └── requirements-dev.txt           # xlwt (mock .xls fixtures), pytest, pytest-cov, httpx (TestClient)
└── frontend/
    ├── app/
    │   ├── page.tsx                   # Toolbar / Home-or-(Rule Editor + Grid) / status bar / session state
    │   ├── layout.tsx                 # MUI SSR cache provider (AppRouterCacheProvider) + providers
    │   └── globals.css
    ├── components/
    │   ├── AppProviders.tsx           # MUI theme + Sonner toaster (errors/warnings only)
    │   ├── AppToolbar.tsx             # Home / Quick Save / Save As / Add Description / Preview Rows / Search / Settings
    │   ├── StatusBar.tsx              # Rows/Columns/matches/Rule + Description stats + completion feedback + Debug metrics
    │   ├── WorkflowBadges.tsx         # V1.07: Converted / Description Applied / Ready to Save status strip
    │   ├── ProcessingOverlay.tsx      # Shown on Convert/Add Description: stage text, indeterminate progress, ETA, Abort
    │   ├── AboutDialog.tsx            # App name/version/git tag/build date/backend+frontend framework
    │   ├── HomeScreen.tsx             # V1.07: application entry point - drag & drop / paste / Convert, replaces UploadDialog
    │   ├── AddDescriptionDialog.tsx   # V1.06: uploads a Description file, merges DESC by PPID
    │   ├── LargeDatasetWarningDialog.tsx  # V1.06: confirm before Preview Rows = All
    │   ├── ReturnHomeDialog.tsx       # V1.07: confirm before discarding an active session via Home
    │   ├── AbortConfirmDialog.tsx     # V1.07: confirm before cancelling an in-flight conversion
    │   ├── RuleEditor.tsx             # Column select/reorder (dnd-kit)/alias/save/update/delete/import/export
    │   └── ExcelGrid.tsx              # AG Grid preview - renders whatever rows/columns it's given (caller filters/slices)
    ├── lib/
    │   ├── api.ts                     # Centralized backend API client (single source for fetch calls)
    │   ├── naturalCompare.ts          # Shared natural-sort comparator (used by AG Grid column sort)
    │   ├── rules.ts                   # TransformationRule type, localStorage persistence, shaping helpers
    │   ├── uploadValidation.ts        # Pure file-rejection-message logic (extracted for testability)
    │   ├── searchFilter.ts            # V1.06: pure row-search predicate (search always runs on the full dataset)
    │   ├── filename.ts                # V1.06: default save filename (RCC_converted_YYMMDD_HHMMSS.xlsx)
    │   └── version.ts                 # FRONTEND_VERSION/GIT_TAG/BUILD_DATE for the About dialog
    ├── types/file-system-access.d.ts  # V1.06: ambient types for showSaveFilePicker (Save As)
    └── vitest.config.mts, vitest.setup.ts  # Vitest suite (run: npm test) - 52 tests
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
