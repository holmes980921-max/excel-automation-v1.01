# Excel Automation

A local, configurable Excel transformation tool. It converts a PPID / Parameter / Reference
Value excel export into a flat table - one row per `TS#` block - and lets you customize which
columns appear, in what order, and under what display name, entirely through the UI (no code
changes required).

**Current version: V1.03 - Transformation Rule Editor**

## Features

### Core conversion (V1.01+)
- **File upload or clipboard paste** - drag & drop / choose an `.xlsx`, or copy a range out of
  Excel (including the header row) and paste it directly.
- **Flexible input columns** - production files can carry extra columns; only `PPID` /
  `Parameter` / `Reference Value` are read (located by header name, with a positional fallback),
  everything else is ignored.
- **Unsupported parameters are ignored** - unrecognized `Parameter` values (and any `TS#` beyond
  `TS#10`) are silently skipped rather than raising an error or inventing new columns.
- **Security** - nothing is ever written to disk; upload/paste, transformation, and export all
  happen in memory for the duration of a single request. No database, no logging of excel
  contents.

### Transformation Rule Editor (V1.03)
- **Output column selection** - enable/disable any of the 9 output columns per rule.
- **Drag & drop column ordering** - reorder columns; both the Preview grid and the downloaded
  file follow the chosen order.
- **Column aliases** - rename exported/displayed headers without touching internal field names
  (sorting, filtering, and the rule JSON itself always use the fixed internal names).
- **Rule management** - save, update, delete, and switch between named rules (e.g. "Engineering",
  "Production", "Quality"), all stored locally in your browser (no server-side database).
- **Import / Export** - rules are portable JSON files; share a rule by exporting it and having a
  teammate import it.
- **Default Rule** - auto-created, always available, cannot be deleted. Selecting it reproduces
  the exact V1.02 output (every column, original order, no aliases). "Reset to Default" restores
  it instantly.
- **Live preview** - every rule edit (toggle/reorder/alias) updates the preview grid immediately.
  No page refresh, no re-upload - the already-converted data is reshaped entirely client-side.
- **Excel-style preview grid** - built on AG Grid: sticky header, pinned first column, resizable
  and movable columns, virtual scrolling, natural sort, row numbers, zebra striping, hover/select
  highlighting, and a warm business color palette.
- **Toolbar + status bar** - Upload / Download / Transformation Rules / Search in a top toolbar;
  row/column/filtered counts and the active rule name in an Excel-like status bar.

## Rule Editor Guide

1. Click **Transformation Rules** in the toolbar to open/close the rule panel (open by default).
2. Pick a rule from the dropdown at the top of the panel, or start from **Default**.
3. For each of the 9 columns:
   - Check/uncheck the box to include/exclude it from the output.
   - Drag the handle (⋮⋮) to reorder it.
   - Type into the alias field to change its displayed/exported header (leave blank to keep the
     original name).
4. The Preview grid and the row/column counts in the status bar update instantly as you edit.
5. **Save As** - type a name and click "Save As" to save your edits as a brand-new rule.
6. **Update** - click "Update" to overwrite the currently-selected (non-Default) rule with your
   edits.
7. **Delete** - removes the currently-selected (non-Default) rule.
8. **Reset to Default** - discards your edits and reloads the Default Rule.
9. **Export** - downloads the current rule as a `.json` file.
10. **Import** - loads a rule from a `.json` file into the editor (click Save/Update to keep it).
11. Click **Download** in the toolbar at any time to export the excel file shaped exactly like
    the current preview - the original upload is never needed again for this.

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
| `aliases` | object | `internal_name -> display_header`. Only affects the header text shown/exported - never the internal field name, so sorting/filtering/rule logic is unaffected. |

Validation is defensive, never throws: unknown column names anywhere in a rule are silently
dropped; a rule that ends up with zero enabled columns falls back to the full column set rather
than producing an empty table. This mirrors the "never throw on unexpected input" behavior of the
transformation engine itself.

## Installation

Requirements: Python 3.12+, Node.js 18+.

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

Start both servers (in separate terminals):

```bash
# Backend - http://localhost:8000
cd backend
./.venv/Scripts/python.exe -m uvicorn app.main:app --port 8000 --host 127.0.0.1

# Frontend - http://localhost:3000
cd frontend
npm run dev
```

Open http://localhost:3000. Click **Upload** to convert a file (or paste data), then use the
**Transformation Rules** panel and the preview grid's Search/Sort/Resize/Move features. Click
**Download** to export the shaped result.

### Generating sample data

```bash
cd backend
./.venv/Scripts/python.exe scripts/make_mock.py scripts/mock_input.xlsx
```

Produces a production-like mock file (many PPIDs, variable TS block counts, extra unrelated
columns, and some unsupported parameters mixed in) useful for manually exercising the app.

## Folder structure

```
excel-automation-v1.01/
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
│   │       └── excel_io.py            # In-memory excel read/write, column resolution
│   ├── scripts/make_mock.py           # Production-like mock data generator
│   └── requirements.txt
└── frontend/
    ├── app/
    │   ├── page.tsx                   # Toolbar / split view (Rule Editor + Grid) / status bar
    │   ├── layout.tsx
    │   └── globals.css
    ├── components/
    │   ├── AppProviders.tsx           # MUI theme + Sonner toaster
    │   ├── AppToolbar.tsx             # Upload / Download / Transformation Rules / Search
    │   ├── StatusBar.tsx              # Rows / Columns / Filtered / Current Rule
    │   ├── UploadDialog.tsx           # File (react-dropzone) or paste input
    │   ├── RuleEditor.tsx             # Column select/reorder (dnd-kit)/alias/save/update/delete/import/export
    │   └── ExcelGrid.tsx              # AG Grid preview, shaped live by the active rule
    └── lib/
        ├── naturalCompare.ts          # Shared natural-sort comparator (used by AG Grid column sort)
        └── rules.ts                   # TransformationRule type, localStorage persistence, shaping helpers
```

Architecture: **Frontend → API → Rule Manager → Transformation Engine → Excel Export.**
`services/excel_transformer.py` (the transformation engine) has not changed since V1.02 and knows
nothing about rules; `services/rule_manager.py` only reshapes its output afterward. This keeps
the transformation logic fully independent from both the UI and the rule system.

## Version history

- **V1.01** - Initial release. Upload/paste → convert → preview → download.
- **V1.02** - `TS#` output format, flexible input columns, client-side search/sort, resizable
  columns, conversion summary panel.
- **V1.03** - Transformation Rule Editor: configurable output columns, ordering, and aliases;
  rule save/update/delete/import/export; live preview; AG Grid-based Excel-style UI. See
  [CHANGELOG.md](./CHANGELOG.md) for details.

## Backward compatibility

Selecting the **Default Rule** (auto-created, always present) produces exactly the same output
as V1.02 - same columns, same order, no aliases. This is verified by an automated regression
test that:

1. Confirms `excel_transformer.py` / `excel_io.py` are byte-identical to the `v1.02` git tag.
2. Runs the V1.01-tag code against the same mock dataset used for the V1.02 regression, and
   diffs it against the current transformer's output (as in V1.02's release notes).
3. Applies the Default Rule to a fresh conversion and asserts the shaped result equals the
   unshaped output exactly.
4. Round-trips a real HTTP request: `/api/convert`'s returned file vs. re-exporting those same
   rows through `/api/export` with the Default Rule (and again with `rule: null`) - both produce
   byte-identical spreadsheets.

All four checks passed on a 150-PPID / 814-row mock dataset. No existing V1.02 functionality
(upload, paste, search, sort, resize, conversion summary) was removed - it was reorganized into
the new toolbar/status-bar/grid, not dropped.
