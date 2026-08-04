# Excel Automation

A local web tool that converts a PPID / Parameter / Reference Value excel export into a flat,
pivot-ready table - one row per `TS#` block, with a fixed, always-present set of output columns.

**Current version: V1.02**

## Features

- **File upload or clipboard paste** - drag & drop / choose an `.xlsx`, or copy a range out of
  Excel (including the header row) and paste it directly.
- **Flexible input columns** - production files can carry extra columns (operator, comments,
  lot number, etc.); only `PPID` / `Parameter` / `Reference Value` are read, everything else is
  ignored. Columns are located by header name when possible, falling back to the original
  positional (first three columns) behavior.
- **Unsupported parameters are ignored** - unrecognized `Parameter` values (and any `TS#`
  beyond `TS#10`) are silently skipped rather than raising an error or inventing new columns.
- **Client-side search** - instant, case-insensitive, partial-match search across every column,
  with a live "Showing X of Y rows" count and a clear (✕) button. No backend requests.
- **Client-side sorting** - click any column header to cycle ascending → descending → original
  order. Uses natural sort everywhere, so `TS#2` sorts before `TS#10` (not after `TS#1`
  alphabetically).
- **Resizable columns** - drag a column's right edge to resize, Excel-style. Widths persist
  while searching/sorting and reset on page refresh.
- **Conversion summary** - after each conversion: PPID count, TS count, generated row count, and
  server-side conversion time.
- **Security** - nothing is ever written to disk. Upload/paste, transformation, and the
  downloadable result all happen in memory for the duration of a single request. No database, no
  logging of excel contents.

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

Open http://localhost:3000, upload (or paste) an excel file, and use the Search / column-header
sort / column-resize / Download controls on the results table.

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
│   │   ├── main.py                 # FastAPI app entry, CORS
│   │   ├── api/routes.py           # HTTP layer only - calls into services/
│   │   ├── services/
│   │   │   └── excel_transformer.py  # Core conversion logic + summary stats
│   │   ├── models/
│   │   │   ├── constants.py        # OUTPUT_COLUMNS etc. - edit here to extend the output shape
│   │   │   └── schemas.py          # Pydantic request/response models
│   │   └── utils/
│   │       └── excel_io.py         # In-memory excel read/write, column resolution
│   ├── scripts/make_mock.py        # Production-like mock data generator
│   └── requirements.txt
└── frontend/
    ├── app/
    │   ├── page.tsx                # Upload/paste, convert, download
    │   ├── layout.tsx
    │   └── globals.css
    ├── components/
    │   ├── PreviewTable.tsx        # Search + sort + resizable-column table
    │   └── ConversionSummaryPanel.tsx
    └── lib/
        └── naturalCompare.ts       # Shared natural-sort comparator
```

Architecture stays layered: **API → Services → Models/Utils**. Transformation logic lives only
in `services/excel_transformer.py`; the API layer is a thin HTTP wrapper around it.

## Version history

- **V1.01** - Initial release. Upload/paste → convert → preview → download. PPID/`TS#n_field`
  parsing with `"-"` fill for missing fields.
- **V1.02** - `TS#` output format, flexible input columns, client-side search/sort, resizable
  columns, conversion summary panel. See [CHANGELOG.md](./CHANGELOG.md) for details.

## Release Notes - V1.02

Built on top of V1.01 with full backward compatibility of the transformation logic (verified by
an automated regression test comparing V1.02's output against the V1.01 code extracted from the
`v1.01` git tag, run on a 150-PPID / 814-row production-like mock dataset - see
`backend/scripts/make_mock.py`). The only intended output difference is the `TS#` column format
(`1` → `"TS#1"`); PPID coverage, row counts, missing-value fills, and column order are unchanged.

The `/api/convert` and `/api/convert-text` responses now return the full converted dataset
(`rows`) instead of a 50-row preview, so the new client-side search/sort/resize features have
the complete data to work with without any additional network requests.
