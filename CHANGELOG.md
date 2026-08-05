# Changelog

## v1.04 - Production Readiness Release

### Added
- Legacy `.xls` support alongside `.xlsx`/`.xlsm`, with automatic format detection from the
  file's actual byte signature (ZIP vs. OLE2) rather than its filename extension -
  `detect_excel_engine()` in `excel_io.py`. Output is always `.xlsx` regardless of input format.
- One-click developer scripts: `run.ps1`/`run.bat` (environment validation, dependency install,
  start both servers, wait for health), `update.ps1`/`update.bat` (git pull + reinstall),
  `scripts/health-check.ps1` (standalone health check)
- `backend/requirements-dev.txt` (`xlwt`) for generating `.xls` mock fixtures
- `lib/api.ts` - centralized frontend API client (was previously duplicated between
  `UploadDialog.tsx` and `page.tsx`)
- Status-bar success feedback (`StatusBar`'s `statusMessage` prop) as the new home for
  "converted", "saved", "updated", "deleted", "reset", "downloaded", "exported" confirmations
- `@mui/material-nextjs` `AppRouterCacheProvider` for correct MUI/Next.js App Router SSR style
  injection
- Visual drag-accept/drag-reject states and friendly rejection messages in the upload dialog
  (via `react-dropzone`'s `isDragAccept`/`isDragReject`/`fileRejections`)

### Changed
- Toast notifications (Sonner) are now reserved for errors/warnings only; moved to
  `position="bottom-right"` so they can never cover the toolbar or search box
- Preview grid: slightly larger row height/padding, a left accent bar on the selected row, and a
  few CSS variable tweaks for readability (still the same warm beige palette introduced in V1.03)
- `DndContext` in `RuleEditor` now has an explicit, stable `id` prop

### Fixed
- Next.js/MUI hydration warning, root-caused via proper SSR emotion-cache integration (not
  suppressed)
- `dnd-kit` SSR id-mismatch warning, root-caused via a stable `DndContext` id (not suppressed)

### Backward Compatibility
- `excel_transformer.py`, `rule_manager.py`, and `constants.py` are unchanged (byte-identical to
  the `v1.03` tag)
- `.xls` and `.xlsx` versions of the same data transform to byte-identical output, verified both
  directly and through a live HTTP `/api/convert` call
- All V1.01-V1.03 functionality (upload, paste, search, sort, resize, rule editor, conversion
  summary) still works - V1.04 changes are quality/UX/DX improvements, not feature removals

---

## v1.03 - Transformation Rule Editor

### Added
- Transformation Rule Editor: enable/disable output columns, drag-and-drop reordering (dnd-kit),
  and column aliasing (rename displayed/exported headers without changing internal field names)
- Rule management: Save, Update, Delete, and switch between named rules (Default is
  auto-created and cannot be deleted); rules persist in browser `localStorage` (no server-side
  database, consistent with the V1.01/V1.02 "no database" posture)
- Rule Import/Export as portable JSON files
- "Reset to Default" - restores the exact V1.02 output configuration
- Live Preview - every rule edit updates the grid instantly, entirely client-side (no re-upload,
  no additional API request)
- New stateless `POST /api/export` endpoint: re-exports already-converted rows shaped by a rule,
  without needing the original uploaded file again
- `backend/app/services/rule_manager.py` - validates and applies a `TransformationRule`
  (column select/reorder/rename), fully decoupled from `excel_transformer.py`
- AG Grid-based Excel-style preview: sticky header, pinned first column, resizable/movable
  columns, virtual scrolling, row numbers, zebra striping, hover/selected-row highlighting, warm
  business color palette (`#F5F5F5` header / `#FFFFFF`+`#FDF8F0` zebra rows / `#EAF4FF` hover /
  `#D6EBFF` selected)
- Full-width split-view layout: top toolbar (Upload, Download, Transformation Rules, Search,
  Settings), Rule Editor + Preview grid side-by-side, Excel-style status bar (Rows, Columns,
  Filtered, Current Rule)
- New frontend dependencies: MUI (UI framework), AG Grid Community (preview grid), dnd-kit (drag
  reorder), react-dropzone (file upload), Lucide React (icons), Sonner (notifications)

### Changed
- Preview table replaced: the hand-rolled search/sort/resize table (`PreviewTable.tsx`) is
  superseded by `ExcelGrid.tsx` (AG Grid); its functionality (search, natural sort, resize) is
  preserved and extended (column move, virtual scrolling, natural sort on every column via the
  same `naturalCompare` utility)
- Conversion summary panel folded into the new status bar (PPID count and conversion time still
  shown, alongside the new Rows/Columns/Filtered/Current Rule fields)

### Backward Compatibility
- `excel_transformer.py` and `excel_io.py` are unchanged (byte-identical to the `v1.02` tag) -
  the transformation engine never learned about rules; rules only reshape its output afterward
- Selecting the Default Rule reproduces V1.02's output exactly - verified by an automated
  regression test (see README → Backward compatibility)
- `/api/convert` and `/api/convert-text` are unchanged from V1.02

---

## v1.02

### Added
- Client-side Search (case-insensitive, partial match, all columns, result count, clear button)
- Client-side Sorting (3-state per-column toggle: ascending → descending → original order)
- Resizable Columns (drag-to-resize, minimum width, persists during search/sort)
- Conversion Summary panel (PPID Count, TS Count, Generated Rows, Conversion Time)
- Flexible Input Columns (extra/reordered columns beyond PPID/Parameter/Reference Value are
  ignored; columns resolved by header name with a positional fallback)
- Clipboard-paste input mode (`POST /api/convert-text`) as an alternative to file upload
- `backend/scripts/make_mock.py` - production-like mock data generator for manual/regression testing

### Changed
- TS output format changed from numeric (`1`, `2`, ...) to `TS#1`, `TS#2`, ... in both the
  preview table and the downloaded excel file
- API response now returns the full converted dataset (`rows`) instead of a 50-row preview, so
  client-side search/sort/resize have complete data without extra requests

### Fixed
- Natural sorting for the TS# column (and, as a side effect of using a general-purpose natural
  comparator, for any other alphanumeric column) - `TS#2` now correctly sorts before `TS#10`

---

## v1.01

Initial Release

- Upload (drag & drop / file picker) or clipboard-paste a PPID / Parameter / Reference Value
  excel export
- Parses `PPID` separator rows and `TS#<n>_<field>` parameters, grouping into one output row per
  `(PPID, TS#)` pair
- Fixed output columns: `PPID, TS#, CardName, FilmMaterial, CorrelationCard_1, CorrelationCard_2,
  CorrelationCard_3, DataCombination, DataFeedFoward`; missing fields filled with `"-"`
- Preview table + one-click download of the converted `.xlsx`
- Nothing written to disk server-side; no database
