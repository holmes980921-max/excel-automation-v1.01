# Changelog

## v1.08 - Production Readiness & Stability

### Release Notes

V1.08 is a stabilization-only release, by explicit design - no new user-facing functionality.
The headline fix is the browser freezing when ~200,000+ rows were pasted into the app: pasted
text now never reaches the DOM (intercepted at the paste event, summarized in a fast single pass,
kept only in memory), root-cause-fixed rather than patched around, with measured verification
(~9ms to summarize 200,000 rows). A dependency audit found that `psutil` - used unconditionally on
every conversion request - was missing from `requirements.txt`, meaning a genuinely clean install
would have crashed on the first real request; this is now fixed and verified with an actual
fresh-virtualenv install test. Two categories of duplicated logic (DESC column placement, and each
API route's exception-handling boilerplate) were consolidated into shared, directly-tested
implementations. A top-level error boundary now catches unexpected UI errors. ESLint is configured
for the first time (flagged as missing since V1.05). Backend test coverage rose from 88% to 94%.
Full detail: [CODE_REVIEW_V1.08.md](./CODE_REVIEW_V1.08.md) (scored **A**),
[PERFORMANCE_REPORT_V1.08.md](./PERFORMANCE_REPORT_V1.08.md),
[DEPENDENCY_AUDIT_V1.08.md](./DEPENDENCY_AUDIT_V1.08.md),
[TEST_COVERAGE_V1.08.md](./TEST_COVERAGE_V1.08.md).

### Fixed
- **Large-paste browser freeze** (~200,000+ rows) - root cause was an MUI `TextField` with no
  `maxRows`, auto-sizing to fit the entire pasted value. Pasted text is now intercepted before it
  reaches the DOM/controlled value at all; the UI shows a lightweight row/column summary instead.
  `frontend/lib/pasteSummary.ts`, `frontend/components/HomeScreen.tsx`.
- **`psutil` missing from `requirements.txt`** - used unconditionally by `PeakMemorySampler` on
  every `/api/convert`/`/api/convert-text` request; a clean install would have crashed on first
  use. Also added `numpy` (directly imported, previously only an invisible transitive dependency).
- A rare off-by-one in the shared mock-data generator's expected-row-count accounting
  (`backend/scripts/make_mock.py`) - surfaced by the new large-dataset test.
- `page.tsx`'s `activeRows` derived value is now memoized - previously recomputed with a new array
  reference on every render whenever there was no active result, needlessly invalidating dependent
  `useCallback`/`useMemo` hooks (caught by newly-enabled ESLint).

### Added
- `backend/app/utils/df_helpers.py` (`find_insert_position`, `insert_column_after`) - shared
  DESC-column-placement logic, replacing two independent implementations.
- `backend/app/api/error_handling.py` (`handle_route_errors`) - shared two-tier exception-handling
  policy (expected rejection -> 400 with its own message; unexpected -> a route-specific friendly
  message), replacing four routes' worth of hand-rolled, and in two cases inconsistent, try/except
  boilerplate.
- `frontend/components/ErrorBoundary.tsx` - top-level React error boundary with a "Return to Home"
  recovery action, wrapping the whole app in `AppProviders`.
- `frontend/eslint.config.mjs` - ESLint flat config (`next/core-web-vitals` + `next/typescript`),
  hand-authored to avoid `next lint`'s interactive first-run wizard; `npm run lint` now runs the
  ESLint CLI directly.
- `noUnusedLocals`/`noUnusedParameters` enabled in `frontend/tsconfig.json`.
- `backend/tests/test_large_dataset.py` - correctness (not just "doesn't crash") check at
  ~175,600-input-row / ~27,000-output-row scale, via both `/api/convert` and `/api/convert-text`.
- `backend/tests/test_df_helpers.py`, `test_error_handling.py` - direct unit tests of the new
  shared helpers.
- `frontend/lib/pasteSummary.test.ts`, `components/ErrorBoundary.test.tsx` - new component/util
  tests, plus new Abort-recovery and large-paste tests added to `HomeScreen.test.tsx`.

### Changed
- `backend/app/api/routes.py` - all four routes now use `handle_route_errors`; `convert_excel` and
  `add_description` share a new `_read_validated_upload()` helper (filename/emptiness/size-cap
  checks were previously copy-pasted between them).
- Removed unused frontend devDependency `@testing-library/user-event`.

### Investigated and resolved (not a code change)
- The recurring "some files with passing tests don't appear in the Vitest coverage table" question
  (flagged in V1.05, V1.06, and V1.07's reports with a different file set each time) is root-caused:
  every affected file achieves literal 100% coverage across all four metrics, and the v8 text
  reporter simply omits fully-covered files from the per-file breakdown. Confirmed by testing
  V1.07's suggested fix (disabling file parallelism - no effect) and then verifying the actual
  hypothesis directly. See `TEST_COVERAGE_V1.08.md`.
- The rule-shaping duplication between `rule_manager.py`/`lib/rules.ts` (flagged since V1.04) was
  reviewed and **deliberately kept** - see `CODE_REVIEW_V1.08.md`'s Architecture section for the
  reasoning, rather than carrying it forward undecided again.

### Known limitations (disclosed, not fixed this version)
- Abort remains client-side only - it cancels the browser's request but does not interrupt the
  backend's already-started computation. Not user-visible at this app's current scale.
- 3 `npm audit` high-severity findings (transitive through `next`'s own dependencies) require a
  Next.js major-version bump, deliberately not performed this version (breaking-change risk).

## v1.07 - User Experience & Workflow

### Release Notes

V1.07 is a UX-only release (per its own spec, internal refactoring/reliability/performance work is
deliberately reserved for V1.08). The application now opens directly onto a **Home screen** - drag
& drop, browse, or paste (Ctrl+V) and Convert, no separate Upload click or modal needed. A **Home**
button always returns there, confirming first if it would discard an active session. In-flight
conversions can now be **Aborted** (with a confirmation), and a slim **workflow badge** strip
(Converted / Description Applied / Ready to Save) gives an at-a-glance read of progress. The
Add Description column now displays and exports immediately after `PPID` instead of at the end,
and the Preview grid's column order is now guaranteed to exactly match the exported file's
("Preview = Export"), verified by a dedicated regression test. Full detail:
[CODE_REVIEW_V1.07.md](./CODE_REVIEW_V1.07.md).

### Added
- `HomeScreen` component - the application's new starting point: a two-panel drag & drop /
  paste layout with a Convert button, replacing the modal `UploadDialog` (deleted this version)
- `AbortController`-based cancellation for `/api/convert`/`/api/convert-text` - `lib/api.ts`'s
  `convertFile`/`convertText` accept an optional `AbortSignal`; an `AbortError` is treated as a
  silent user-initiated cancel, not a failure (no error toast)
- `AbortConfirmDialog` - "Abort current conversion? Unfinished results will be discarded." /
  Abort / Continue - shown when Abort is clicked on the processing overlay
- `ReturnHomeDialog` - "Return to Home? Current session will be discarded." / Home / Stay -
  shown when the new Home button is clicked while a conversion result exists
- `WorkflowBadges` component - Converted / Description Applied / Ready to Save status chips,
  shown once a conversion exists
- `ExcelGrid`'s `extraColumns` gained an `insertAfterField` option, used to splice the `DESC`
  column in right after `PPID` instead of appending it at the end
- 4 new backend tests (DESC-after-PPID ordering in both `/api/add-description` and `/api/export`,
  including with a column-reordering rule active) and 15 new frontend tests (`WorkflowBadges`,
  `ReturnHomeDialog`, `AbortConfirmDialog`, and `HomeScreen`'s paste-conversion path)

### Changed
- `description_merger.py`'s `merge_description()` now places `DESC` immediately after `PPID` in
  its output (was appended at the end) - both `/api/add-description`'s response and
  `/api/export`'s output reflect this, so the Preview grid and the saved file always agree
  ("Preview = Export")
- `/api/export` now inserts `DESC` at `PPID`'s position within the *active rule's* shaped output
  (not just the default column order), so this holds even with a custom Transformation Rule
- Toolbar: **Upload** button replaced by **Home** (top-left); Add Description/Quick Save/Save
  As/Preview Rows/Search/Transformation Rules are now hidden entirely until a conversion result
  exists, instead of being shown-but-disabled
- `ProcessingOverlay` gained an optional `onAbortClick` prop that renders an Abort button

### Removed
- `UploadDialog.tsx` - fully superseded by `HomeScreen.tsx`

### Known limitations
- Abort cancels the browser's in-flight request immediately, but does not interrupt the backend's
  already-started computation server-side (its result is simply discarded when it arrives) - not
  user-visible at this app's target scale (sub-2s conversions), genuine server-side cancellation
  is reserved for V1.08 (reliability)

## v1.06 - Productivity & User Experience

### Release Notes

V1.06 focuses on eliminating repetitive post-conversion Excel work. The headline feature is
**Add Description**: upload a `PPID`/`DESC` lookup file and every converted row gets its `DESC`
automatically merged in (left join, unmatched rows left as `-`), removing the manual VLOOKUP/
XLOOKUP step users were doing by hand. Alongside that: a **Preview Rows** control (100/500/1000/
5000/All) so large datasets don't force the grid to render everything, search that always matches
against the full dataset regardless of the preview setting, a Large Dataset Warning before
rendering everything, and **Quick Save**/**Save As** (replacing the single Download button) with
an auto-generated timestamped filename. The core transformation engine
(`excel_transformer.py`/`constants.py`) is untouched - confirmed byte-identical to the `v1.05` git
tag. Full detail: [CODE_REVIEW_V1.06.md](./CODE_REVIEW_V1.06.md).

### Added
- `POST /api/add-description` - stateless endpoint that left-joins a `DESC` column onto
  already-converted rows by `PPID` (`backend/app/services/description_merger.py`); validates the
  Description file has `PPID`/`DESC` columns and that `PPID` is unique, and reports matched/
  unmatched `PPID` counts
- `read_description_file()` in `excel_io.py` - reuses the same format auto-detection (calamine-
  first, HTML-as-.xls, openpyxl/xlrd fallback) as the main conversion path
- `AddDescriptionDialog` component - upload flow for the Description file, always merges against
  the original conversion (never stacks onto a previous merge)
- `DESC` now rides along on `/api/export` whenever present in the submitted rows, regardless of
  the active Transformation Rule (it isn't part of the rule-shapeable column set)
- Preview Rows selector (100/500/1000/5000/All) in the toolbar; `ExcelGrid` now renders exactly
  the rows/columns it's given instead of doing its own AG Grid quick-filtering
- `frontend/lib/searchFilter.ts` - pure row-search predicate; search always evaluates against the
  full dataset so the match count is accurate independent of the Preview Rows setting
- `LargeDatasetWarningDialog` - confirmation before Preview Rows = All, with a "Don't show this
  warning again" preference persisted to `localStorage`
- `frontend/lib/filename.ts` (`generateDefaultFilename`) - `RCC_converted_YYMMDD_HHMMSS.xlsx`
- `saveAs()` in `lib/api.ts` - Save As via the File System Access API (`showSaveFilePicker`,
  Chromium-based browsers), falling back to the same download-trigger Quick Save uses elsewhere
- `frontend/types/file-system-access.d.ts` - ambient types for `showSaveFilePicker` (not part of
  TypeScript's bundled `lib.dom.d.ts`)
- 14 new backend tests (`test_description_merge.py`, `/api/add-description` + DESC-passthrough
  cases in `test_routes.py`) and 12 new frontend tests (`filename.test.ts`, `searchFilter.test.ts`,
  expanded `StatusBar.test.tsx`)

### Changed
- Toolbar: single **Download** button replaced by **Quick Save** (instant, default filename) and
  **Save As** (native save dialog where supported)
- `StatusBar`: "Filtered" (tied to AG Grid's internal quick filter) replaced by a combined rows/
  matches summary ("Showing 100 of 8,542 rows" / "342 matches - Showing first 100 rows"), plus
  Description matched/unmatched counts once Add Description has run
- `ExcelGrid` no longer performs its own filtering (`quickFilterText` prop removed) - the caller
  (`app/page.tsx`) now filters and slices rows before they reach the grid, which is what makes
  "search matches the full dataset, display respects Preview Rows" possible
- A new conversion (re-upload or re-paste) always discards any prior Add Description merge and
  resets Preview Rows/search to their defaults

### Known limitations
- Save As's native folder picker only works in Chromium-based browsers (Chrome, Edge); Firefox/
  Safari fall back to Quick Save's behavior, since neither implements the File System Access API
- There is no "Open Folder" action after saving - no browser exposes an API for a sandboxed web
  page to open the OS file explorer, so this affordance from the original proposal isn't
  implementable client-side

## v1.05 - Performance, Reliability & Observability

### Release Notes

V1.05 is an engineering-quality release: no new business features, per its own spec. The
headline result is an **8.6x speedup at the app's target 300,000-row scale** (15.24s → 1.77s),
achieved by adopting a Rust-based excel reader (`python-calamine`) only after validating it
produces byte-and-type-identical output to the previous engines, and by removing a wholly unused
xlsx-write pass that ran on every conversion. Alongside that: a Processing Overlay so long
conversions never look frozen, a 250 MB upload cap and broader exception handling for
reliability, structured logging plus an opt-in Debug Mode for observability, real `pytest`/
`Vitest` test suites where none existed before, and a simplified default UI (Transformation
Rules now live behind Settings → Advanced; the header no longer hardcodes a version). Full
detail: [PERFORMANCE_BENCHMARK_V1.05.md](./PERFORMANCE_BENCHMARK_V1.05.md),
[TEST_COVERAGE_V1.05.md](./TEST_COVERAGE_V1.05.md),
[CODE_REVIEW_V1.05.md](./CODE_REVIEW_V1.05.md) (scored **A-**).

### Added
- `python-calamine` as the default `.xlsx`/`.xls` reader (openpyxl/xlrd remain as an automatic,
  tested fallback) - validated byte-and-type-identical across 6 scenarios before adoption
  (`backend/tests/test_calamine_equivalence.py`)
- `backend/scripts/benchmark.py` - reusable performance harness (timing per stage, peak memory
  via a background RSS sampler, rows/sec), backing the Performance Benchmark Report
- `backend/app/utils/perf.py` (`PeakMemorySampler`) and `logging_config.py` (structured
  Application/Error/Performance/Debug logging) - shared by the benchmark script and the app itself
- Optional Debug Mode (Settings menu, off by default; `?debug=true` on `/api/convert*`) - adds
  per-stage timing, peak memory, and which read engine was used to the Status Bar and API response
- `MAX_UPLOAD_SIZE_BYTES` (250 MB) upload cap with a clean 413 response
- A global FastAPI exception handler as a second line of defense beyond each route's own
  `except Exception` handling
- `ProcessingOverlay` component: shown immediately on Convert, cycles through stage labels
  (Reading Excel → Parsing Workbook → Applying Transformation Rules → Generating Output →
  Preparing Preview), an indeterminate progress bar (honest about not having real mid-request
  progress from a synchronous HTTP call), and a rough time estimate from file size
- Upload/Convert are disabled and the dialog can't be dismissed while a conversion is in flight,
  preventing duplicate requests
- `AboutDialog` (Settings menu): app name, version, git tag, build date, backend/frontend framework
- `Settings → Show Advanced Features` toggle (off by default) - hides/shows the Transformation
  Rule Editor without removing any functionality
- `GET /api/version` endpoint, backing the About dialog instead of a hardcoded frontend string
- `backend/tests/` - 37 `pytest` tests (88% line coverage): calamine equivalence, format
  detection, transformer invariants, rule shaping, and full HTTP-level route tests via
  `TestClient` (including the new upload-size-limit and debug-mode behavior)
- Frontend `Vitest` suite - 25 tests (72% coverage on touched files): natural sort, upload
  rejection messages, rule shaping/import-export, `StatusBar`, `ProcessingOverlay`
- `frontend/lib/uploadValidation.ts` - file-rejection-message logic extracted out of
  `UploadDialog.tsx` specifically so it's unit-testable without mounting a component

### Changed
- `ConvertResponse` no longer includes `file_base64` - it was generated on every conversion but
  never read by the frontend (Download already went through the separate `/api/export`
  endpoint); removing it eliminated a full xlsx-write-and-base64-encode pass from every request
- `ExcelTransformer._to_dataframe` builds columns as dict-of-lists instead of a list of per-row
  dicts - faster and leaner at scale, same output
- Excel reads use calamine by default (see Added); openpyxl's `read_only=True` mode is used for
  the fallback path
- The app header now reads "Excel Automation" (no version suffix); version is shown live in the
  About dialog instead

### Fixed
- No upload size limit previously existed - an arbitrarily large file would be read entirely
  into memory before any validation ran (a real OOM/crash risk, flagged in `CODE_REVIEW_V1.04.md`)

---

## v1.04.1 - Patch Release

### Fixed
- **Critical: `.xls` conversion failure.** Root cause: many ERP/MES "export to Excel" tools
  actually write an HTML `<table>` and save it with a `.xls` extension - Excel opens these
  transparently (and Windows labels them "Microsoft Excel 97-2003 Worksheet" purely from the
  extension), but our byte-signature check only recognized true OLE2/ZIP binaries and rejected
  them with "Unrecognized file format". Reproduced with a genuine Excel-saved `.xls` generated
  via COM automation on a real Excel install, confirming true binary `.xls`/`.xlsx` were never
  broken - only this specific, common export pattern. Fixed by detecting an HTML document
  (`_looks_like_html`) before falling back to the OLE2/ZIP signature check, and parsing it with
  `pandas.read_html` (new `lxml` dependency). Both `.xls` variants now produce byte-identical
  output to the equivalent `.xlsx`.
- **Medium: zebra striping (and row hover/selected highlighting) not rendering.** Root cause:
  the bundled AG Grid v36 "legacy" CSS theme (`ag-theme-quartz.css`) defines no CSS rules at all
  for `.ag-row-odd`/`.ag-row-even`/`.ag-row-hover`/`.ag-row-selected` - the `--ag-odd-row-*`/
  `--ag-row-hover-color`/`--ag-selected-row-background-color` custom properties set in V1.04 were
  never consumed by anything (verified by inspecting the shipped stylesheet directly). AG Grid's
  JS does still add those four classes to each row based on data row index (not DOM position, so
  it stays correct under virtualization), so fixed by writing explicit CSS rules against those
  classes instead of relying on theme variables this theme build never reads. Row hover and
  selected-row highlighting - both explicit V1.03 requirements - turn out to have been silently
  non-functional since V1.03 for the same reason; fixed as part of the same root cause.
- **UX: Status Bar didn't visibly return to an idle state.** The success-message auto-clear timer
  (4s) was already firing correctly, but the bar just went blank afterward with no visible
  confirmation anything happened - easy to misread as stuck. Now shows a neutral "Ready" state
  whenever no transient message is active.

### Added
- `backend/tests/` - a real, committed `pytest` suite (17 tests: format detection/HTML-masquerading-as-.xls,
  core transformer invariants, rule manager shaping/fallbacks). Run with `pytest` from `backend/`.
  A first step against the "no automated test suite" gap noted in `CODE_REVIEW_V1.04.md`.

### Verified
- All V1.01-V1.04 functionality re-confirmed: `excel_transformer.py`, `rule_manager.py`, and
  `constants.py` remain byte-identical to the `v1.03` tag; the full V1.01-vs-current regression
  chain still passes; `.xlsx`, `.xlwt`-generated `.xls`, and real-Excel-saved `.xls` all convert
  to byte-identical output via a live HTTP `/api/convert` call.

---

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
