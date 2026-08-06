# Excel Automation

A local, configurable Excel transformation tool. It converts a PPID / Parameter / Reference
Value excel export into a flat table - one row per `TS#` block - and lets you customize which
columns appear, in what order, and under what display name, entirely through the UI (no code
changes required).

**Current version: V1.04.1**

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

## Rule Editor Guide

1. Click **Transformation Rules** in the toolbar to open/close the rule panel (open by default).
2. Pick a rule from the dropdown at the top of the panel, or start from **Default**.
3. For each of the 9 columns: check/uncheck to include/exclude, drag the handle (⋮⋮) to reorder,
   type into the alias field to change its displayed/exported header.
4. The Preview grid and the row/column counts in the status bar update instantly as you edit.
5. **Save As** a new rule, **Update** the current one, **Delete** it, or **Reset to Default**.
6. **Export**/**Import** a rule as `.json` to share it with a teammate.
7. Click **Download** in the toolbar at any time to export the excel file shaped exactly like the
   current preview - the original upload is never needed again for this.

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

## Folder structure

```
excel-automation-v1.01/
├── run.ps1 / run.bat         # One-click start (env check + install + launch + health check)
├── update.ps1 / update.bat   # One-click update (git pull + reinstall)
├── scripts/health-check.ps1  # Standalone health check
├── examples/rules/           # Example rule JSON files
├── backend/
│   ├── app/
│   │   ├── main.py                    # FastAPI app entry, CORS
│   │   ├── api/routes.py              # HTTP layer only - calls into services/
│   │   ├── services/
│   │   │   ├── excel_transformer.py   # Core conversion logic (unchanged since V1.02) + summary stats
│   │   │   └── rule_manager.py        # Validates/applies a TransformationRule (column select/order/alias)
│   │   ├── models/
│   │   │   ├── constants.py           # OUTPUT_COLUMNS etc. - the fixed internal column set
│   │   │   └── schemas.py             # Pydantic request/response models incl. TransformationRule
│   │   └── utils/
│   │       └── excel_io.py            # In-memory excel read/write; .xls/.xlsx auto-detection, column resolution
│   ├── scripts/make_mock.py           # Production-like mock data generator (.xlsx and .xls)
│   ├── tests/                         # pytest suite (run: pytest, from backend/)
│   ├── requirements.txt
│   └── requirements-dev.txt           # xlwt (mock .xls fixtures) + pytest
└── frontend/
    ├── app/
    │   ├── page.tsx                   # Toolbar / split view (Rule Editor + Grid) / status bar
    │   ├── layout.tsx                 # MUI SSR cache provider (AppRouterCacheProvider) + providers
    │   └── globals.css
    ├── components/
    │   ├── AppProviders.tsx           # MUI theme + Sonner toaster (errors/warnings only)
    │   ├── AppToolbar.tsx             # Upload / Download / Transformation Rules / Search
    │   ├── StatusBar.tsx              # Rows / Columns / Filtered / Current Rule + success feedback
    │   ├── UploadDialog.tsx           # File (react-dropzone, .xls/.xlsx/.xlsm) or paste input
    │   ├── RuleEditor.tsx             # Column select/reorder (dnd-kit)/alias/save/update/delete/import/export
    │   └── ExcelGrid.tsx              # AG Grid preview, shaped live by the active rule
    └── lib/
        ├── api.ts                     # Centralized backend API client (single source for fetch calls)
        ├── naturalCompare.ts          # Shared natural-sort comparator (used by AG Grid column sort)
        └── rules.ts                   # TransformationRule type, localStorage persistence, shaping helpers
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
  added a real `pytest` suite under `backend/tests/`. See [CHANGELOG.md](./CHANGELOG.md).

## Backward compatibility

Selecting the **Default Rule** (auto-created, always present) produces exactly the same output
as V1.02 - same columns, same order, no aliases - for both `.xlsx` and `.xls` input. This is
verified by an automated regression test that:

1. Confirms `excel_transformer.py`, `rule_manager.py`, and `constants.py` are byte-identical to
   the `v1.03` git tag (and `excel_transformer.py`/`constants.py` to `v1.02` as well).
2. Runs the V1.01-tag code against the same mock dataset used since V1.02, and diffs it against
   the current transformer's output.
3. Applies the Default Rule to a fresh conversion and asserts the shaped result equals the
   unshaped output exactly.
4. Confirms `.xls` and `.xlsx` versions of the same mock dataset transform to byte-identical
   output, both directly and through a live HTTP `/api/convert` call.
5. Round-trips a real HTTP request: `/api/convert`'s returned file vs. re-exporting those same
   rows through `/api/export` with the Default Rule - byte-identical spreadsheets.

All checks passed on a 150-PPID / 814-row mock dataset. No existing V1.01-V1.03 functionality was
removed - notification and layout changes reorganize where feedback appears, not what exists.
