# Changelog

> Renamed from "Excel Automation" to "**RCC Excel Automation**" in v1.09 (branding only). Entries
> below for earlier versions use the name in effect at the time.

## v1.14 - Pre-PPID Data Extraction & User-Friendly Converted Output

### Release Notes

V1.14 adds two new Converted Output columns - `PreProcess` and `ReferenceTestPathName`, sourced
from RCC's `TS#N_PreProcess`/`TS#N_ReferenceTestPathName` fields - using the exact same TS#
matching logic every other field (`CorrelationCard_1/2/3`, `DataCombination`, `DataFeedFoward`)
already used; no parallel matching system was built. The only genuinely new transformation logic
is a last-backslash Value extraction (`%%%%\PROCESS\QWEDWQASJ_2` -> `QWEDWQASJ_2`), scoped to
exactly these two fields. The final Converted Output is now 11 columns, with the two new ones
shown under shorter, human-facing names (`CB-Pre-PPID`, `DFF-Pre-PPID`) rather than their longer
RCC technical names - existing column names are unchanged. No conversion logic for any existing
field changed, Add Description/Error Details/Film Material Visualization/Material DB are
untouched, and the Rule Editor needed no changes. Full detail:
[CODE_REVIEW_V1.14.md](./CODE_REVIEW_V1.14.md).

### Added
- **`PreProcess`/`ReferenceTestPathName` output columns** (`lib/rules.ts`'s `BASE_COLUMNS`) -
  `lib/converter/transformer.ts`'s existing generic `TS#N_<field>` matching loop needed no code
  change to start producing them; a matching row's TS# number is used exactly as it already is for
  every other field.
- **Last-backslash Value extraction** (`lib/converter/lastPathSegment.ts`, new) - applied only to
  `PreProcess`/`ReferenceTestPathName` inside `transformer.ts`'s per-column loop. A value
  containing `\` keeps only the text after the last one; a value without `\` is left completely
  unchanged. Handles backslash edge cases (trailing `\`, consecutive `\\`) without throwing, though
  per spec these aren't expected in real RCC data.
- **`DEFAULT_COLUMN_HEADERS`** (`lib/rules.ts`) - a small map from internal field name to a default
  user-facing header (`PreProcess` -> `CB-Pre-PPID`, `ReferenceTestPathName` -> `DFF-Pre-PPID`),
  used as a fallback in `resolveDisplayColumns` (Preview grid) and `ruleManager.ts`'s `applyRule`
  (export), both of which already had a `field -> header` alias-resolution step this only extends.
  A rule's own `aliases` still take priority, so a user can still rename these columns further via
  the existing Rule Editor, unchanged.
- **`COLUMN_MIN_WIDTH_OVERRIDES`** (`ExcelGrid.tsx`) plus a general `white-space: nowrap` fix for
  AG Grid header text (`globals.css`) - the shipped AG Grid stylesheet's header-text CSS has
  `word-break: break-word` with no `white-space: nowrap` at all (verified by grepping the actual
  shipped CSS), so a long header can genuinely wrap without this; applied to every header, not just
  the two new ones, since no existing header ever benefited from wrapping.
- 18 new tests across `transformer.test.ts` (TS# matching + backslash extraction, all of the
  spec's required test cases), `rules.test.ts`/`ruleManager.test.ts` (default header + explicit
  alias override, exact 11-column output order), `regression.test.ts` (real-fixture sanity check),
  `ExcelGrid.test.tsx`, and `globals.css.test.ts`.

### Known limitations (disclosed, not fixed this version)
- No live-browser interactive verification in this environment (no browser automation tool
  available) - covered instead by component tests (RTL/jsdom) and, where jsdom can't measure real
  layout (column pixel width, header wrapping), by reading the actual CSS source and the width
  override values directly.
- Existing user-saved custom Transformation Rules (localStorage, pre-V1.14) will not automatically
  enable the two new columns - the Rule Editor's existing "append missing known columns, disabled
  by default" behavior applies, same as it would for any future `BASE_COLUMNS` addition; a user
  re-opening a custom rule can enable them manually. The Default Rule shows them immediately.

## v1.13.1 - Clipboard-Only Input UX Follow-up Fix

### Release Notes

V1.13.1 finalizes V1.13's clipboard-only mandate after a follow-up review found two remaining
inconsistencies: the Home screen showed the same RCC workflow instructions twice (a page-level
guide block and the paste-area placeholder), and Add Description still offered Upload/Drag & Drop
even though Conversion Input had already moved to Clipboard Paste only. Both are fixed here. No
conversion logic, Error Details, Film Material Visualization, or Material DB behavior changed -
Add Description's PPID-matching behavior is identical, only its *input method* changed.

### Changed
- **Removed the redundant "How to get your data" guide** from the Home screen (`HomeScreen.tsx`) -
  the identical 4-step workflow already lives in the paste area's placeholder, so showing it twice
  was redundant UI. The placeholder itself is unchanged.
- **Add Description is now Clipboard Paste only** (`AddDescriptionDialog.tsx`) - Upload and
  Drag & Drop (`react-dropzone`, the file-selection state/UI, the `addDescription` file-based call)
  were removed, matching Conversion Input's V1.13 standardization. The dialog's description text
  was rewritten to no longer mention Upload or Drag & Drop.
- **Add Description's example format moved into its paste area's placeholder** (`PPID | DESC`
  example, light/subdued, disappears on paste) instead of a separate permanent block above the
  input - the same pattern V1.13 already established for Conversion Input.

### Known limitations (disclosed, not fixed this version)
- No live-browser interactive verification in this environment (no browser automation tool
  available) - covered instead by component tests (RTL/jsdom) and a local dev-server boot check.
- `next build` still fails locally with the same pre-existing, disclosed Windows-only `EISDIR` bug
  documented since V1.03 (unrelated to any application code) - production build verification relies
  on GitHub Actions' Linux CI runner, as in every prior version.

## v1.13 - Clipboard-Only Input UX & Documentation Update

### Release Notes

V1.13 is a UX/documentation release - no conversion, Add Description, Error Details, Film Material
Visualization, or Material DB logic changed. It standardizes the Home screen's Conversion Input on
a single method, Clipboard Paste, removing Upload and Drag & Drop so there's only one workflow to
learn and document; the initial screen and the paste area's placeholder both spell out the same
4-step "All Export to Excel" -> `EXPORT_ALL_TABLE_%%.xls` -> Ctrl+A/Ctrl+C -> Paste workflow. Add
Description is unchanged and keeps all three of its existing input methods (Upload, Drag & Drop,
Clipboard Paste) - it gained only a light example-format guide, no new input controls. Help &
Support's User Guide/FAQ/Troubleshooting were rewritten to consistently describe the clipboard-only
workflow. Film Material Visualization gained a subtle hover affordance (underline + slight color
shift) for discoverability; its click behavior, parsing, and modal content are otherwise unchanged.
Full detail: [CODE_REVIEW_V1.13.md](./CODE_REVIEW_V1.13.md).

### Changed
- **Conversion Input is now Clipboard Paste only** (`HomeScreen.tsx`) - Upload and Drag & Drop
  (`react-dropzone`, the file-selection state/UI, `convertFile`) were removed from the Home screen
  entirely; the old two-panel Upload/Paste layout collapsed to a single Paste panel.
- **Initial screen guidance** - a numbered 4-step guide (same wording as the placeholder) is shown
  directly on the Home screen, not just inside the paste area.
- **Paste area placeholder** - light/subdued placeholder text repeating the same 4 steps, using the
  exact product names `"All Export to Excel"` and `"EXPORT_ALL_TABLE_%%.xls"`; disappears naturally
  once the user pastes.
- **Add Description** (`AddDescriptionDialog.tsx`) - added a light "We provide the example format."
  guide with a sample `PPID | DESC` table above the existing (unchanged) Upload/Drag & Drop/Paste
  controls.
- **Film Material hover affordance** (`ExcelGrid.tsx`, `globals.css`) - a `film-material-cell` CSS
  class now applies a subtle underline + color-shift transition on hover to clickable filmmaterial
  cells; normal (non-hovered) appearance is unchanged plain table text, and it's still a click on
  the cell itself, not a separate button.
- **`USER_GUIDE.md`, `FAQ.md`, `TROUBLESHOOTING.md`** rewritten to describe the clipboard-only
  Conversion Input workflow, with explicit "upload/drag & drop isn't supported" guidance and
  Ctrl+A/Ctrl+C/paste troubleshooting steps; Add Description's own documentation (still 3 methods)
  was left untouched.

### Fixed
- A missing/placeholder filmmaterial value (`"-"`) was incorrectly treated as clickable (pointer
  cursor, and now hover-affordance) due to a pre-existing V1.12 truthy-string check that didn't
  exclude it - fixed via a shared `isClickableFilmMaterialValue` helper now used consistently by
  both the cursor/hover styling and the click handler.

### Known limitations (disclosed, not fixed this version)
- No live-browser interactive verification in this environment (no browser automation tool
  available) - covered instead by component tests (RTL/jsdom) and a local dev-server boot check.

## v1.12 - Film Material Visualization

### Release Notes

V1.12 adds a click-to-visualize feature for the `filmmaterial` column in the converted result
table: clicking a value opens a modal showing its layer structure, parsed TOP to BOTTOM against an
administrator-editable Material DB, with each layer colored and labeled by Material Code. The
feature is fully additive and isolated - no Excel conversion, rule-shaping, or Add Description
logic changed, and a missing/invalid Material DB disables Visualization only, never the rest of
the app. Full detail: [CODE_REVIEW_V1.12.md](./CODE_REVIEW_V1.12.md).

### Added
- **Film Material Visualization modal** (`FilmMaterialVisualizationDialog.tsx`) - opens on a click
  on any non-empty `filmmaterial` grid cell (`ExcelGrid.tsx` gained a pointer cursor + an optional
  `onFilmMaterialClick` prop for this). Shows the source value, then TOP/BOTTOM labels around a
  scrollable stack of fixed-width/fixed-height, black-bordered, Material-colored layers. Closes via
  the × button, an outside click, or Esc (all three, per spec).
- **Material DB** (`frontend/public/data/material-db.csv`, `Material Code,Color`) - the sole
  source of the Material/color mapping; no hard-coded colors in application code. Loaded once and
  cached (`lib/materialDb.ts`); validated on load for duplicate Material Codes and invalid colors,
  with distinct error messages for "the file is unreadable" (Material Database Unavailable) vs.
  "the file loaded but its content is wrong" (Material Database Error).
- **Longest Match First parser** (`lib/filmMaterialParser.ts`) - tokenizes a Material Structure
  string against the DB's known codes, longest first, so a multi-character code like `AB` is never
  misread as separate `A` + `B` layers. Determines the Bottom layer per spec: the field immediately
  after the structure is an explicit Bottom only if it's a registered Material Code, otherwise
  Bottom defaults to `Si`. An unrecognized character anywhere in the structure produces a clean
  "Unknown Material" error - never a partial or guessed layer diagram.
- **Color validation + contrast** (`lib/cssColor.ts`) - accepts HEX (`#RGB`/`#RRGGBB`) and the full
  CSS3 extended color-keyword set (147 names, e.g. `purple`), resolved via a fixed lookup table
  (not DOM/browser color-serialization behavior, which isn't reliably consistent across engines).
  Background/text contrast uses the standard YIQ perceived-brightness heuristic.
- 45 new tests across `cssColor.test.ts`, `materialDb.test.ts`, `filmMaterialParser.test.ts`
  (including all 5 spec-required cases plus additional edge cases), `FilmMaterialVisualizationDialog.
  test.tsx`, and `ExcelGrid.test.tsx` (the latter a first dedicated test file for that component).

### Known limitations (disclosed, not fixed this version)
- Spec's five required test cases contain an internal inconsistency between Case 1 (expects `ABC`
  to tokenize as `A,B,C`) and the shared mock Material DB used everywhere else (which registers
  `AB` as a 2-character code, so `ABC` correctly tokenizes as `AB,C` under Longest Match First -
  the same rule Case 2 explicitly tests and requires). Resolved by giving Case 1 its own DB fixture
  without `AB`, since Case 1's stated purpose is testing basic parsing + default-Si-bottom in
  isolation, not Longest Match First (which Case 2 owns) - see CODE_REVIEW_V1.12.md.
- No live-browser interactive verification in this environment (no browser automation tool
  available) - covered instead by component tests (RTL/jsdom) and a local dev-server boot check.

## v1.11 - User Guide & Support

### Release Notes

V1.11 is a documentation and support/UX release - no conversion logic changed. It adds a **Help &
Support** dialog (User Guide, FAQ, Troubleshooting, Error Details) reachable from the toolbar at
all times, with content sourced from plain Markdown files under `frontend/public/docs/` so an
administrator can edit questions, answers, and guide text directly on GitHub without touching any
React/TypeScript. It also extends the existing Error Log Viewer ("Show Details") to everyday
Convert/Add Description failures, not just full-page crashes - while adding a privacy gate that
withholds it for a validation error whose message already reflects the user's own data (e.g. a
duplicate-PPID list), so a copyable diagnostic log never contains business data. Full detail:
[CODE_REVIEW_V1.11.md](./CODE_REVIEW_V1.11.md).

### Added
- **Help & Support dialog** (`HelpSupportDialog.tsx`) - four tabs: User Guide, FAQ, Troubleshooting,
  Error Details. User Guide/FAQ/Troubleshooting are fetched at runtime from
  `frontend/public/docs/{USER_GUIDE,FAQ,TROUBLESHOOTING}.md` (`lib/docsLoader.ts`) and rendered
  with `react-markdown`/`remark-gfm` through MUI-styled component mappings (`MarkdownDoc.tsx`), so
  content matches the app's existing visual language rather than looking like raw HTML. FAQ's `##`
  headings are split into individual accordion entries (`lib/faqParser.ts`).
  Error Details is static documentation about the feature itself (not a live log viewer) - the
  live diagnostic view stays contextual, right where an error actually happens.
- **Show Details on everyday failures**: `HomeScreen.tsx` (failed Convert) and
  `AddDescriptionDialog.tsx` (failed merge) now offer the same `ErrorLogDialog`/Copy Log flow
  `ErrorBoundary`'s crash screen already had, via the same `buildErrorLogEntry` builder (new
  `errorLog.ts` helper: `toError()`, normalizing a caught `unknown` into a real `Error`).
- **Privacy gate for the diagnostic log** (spec requirement: logs must never contain business
  data): `InvalidExcelFormatError` (in both `excelIO.ts` and `descriptionMerger.ts`) now sets
  `this.name = "InvalidExcelFormatError"` explicitly; `worker.ts` checks this and tags its
  response with `isValidationError`; `workerClient.ts`'s new `WorkerError` and `api.ts`'s
  `ApiError` carry the flag across the Worker boundary (where class identity doesn't survive
  `postMessage`'s structured clone). `HomeScreen.tsx`/`AddDescriptionDialog.tsx` skip offering
  "Show Details" when `err.isValidationError` is true - the on-screen message (which may
  legitimately echo back a duplicate-PPID list) already contains everything the log would.
- Input Data documentation explicitly describes the normal RCC workflow (download → copy → paste)
  and a Ctrl+A/Ctrl+C fallback for when a direct clipboard paste doesn't register.
- 20 new tests: `docsLoader.test.ts`, `faqParser.test.ts`, `HelpSupportDialog.test.tsx`, new
  Error Details describe blocks in `HomeScreen.test.tsx`/`AddDescriptionDialog.test.tsx` (both the
  positive "Show Details appears" case and the negative "not offered for a validation error"
  case), `toError()` tests in `errorLog.test.ts`, and `.name` regression guards in
  `excelIO.test.ts`/`descriptionMerger.test.ts`.

### Fixed
- Two `page.test.tsx` tests carried an implicit 5000ms default timeout that intermittently failed
  under coverage-instrumentation overhead (a known, previously-partially-fixed flake class from
  V1.09) - the second test in that describe block now has the same explicit `10000`ms timeout the
  first one already had.

### Known limitations (disclosed, not fixed this version)
- Show Details is intentionally never offered for a validation-class error - a deliberate scope
  boundary, not an oversight (see Release Notes above).
- Everything carried over unchanged from V1.10's own Known limitations (large-file performance,
  Debug Mode's peak-memory figure, no live-browser interactive verification in this environment).

## v1.10 - Browser Edition

### Release Notes

V1.10 is a temporary Browser Edition: the entire conversion pipeline (excel read, transform, rule
shaping, Add Description merge, `.xlsx` export) ported from Python/FastAPI to JavaScript/
TypeScript, running fully client-side and deployed as a static site to GitHub Pages via GitHub
Actions - no backend, no database, nothing uploaded anywhere. It exists to get real users on the
app and collect real usage feedback while the team's internal server access is still ~1 month out,
ahead of a planned V2.0 Server Edition built on the preserved V1.09 Python/FastAPI backend
(`release/v1.09`, untouched by this branch). Along the way it also closes a real V1.09 gap (Add
Description had no Clipboard Paste support) and turns Abort from a "discard the response" fake
cancellation into a genuine one, made possible by moving conversion into a Web Worker. Full detail,
including the field-for-field regression results against the Python engine and known limitations:
[CODE_REVIEW_V1.10.md](./CODE_REVIEW_V1.10.md).

### Added
- `frontend/lib/converter/` - a direct TypeScript port of every backend service/util needed for
  conversion (`transformer.ts`, `ruleManager.ts`, `descriptionMerger.ts`, `dfHelpers.ts`,
  `excelIO.ts`), orchestrated by `engine.ts` and run inside a Web Worker (`worker.ts`, via
  `workerClient.ts`) so the UI thread never blocks and Abort can genuinely terminate an in-flight
  conversion (`worker.terminate()`) instead of just discarding a response.
- SheetJS (`xlsx`) reads/writes `.xls`/`.xlsx`/`.xlsm` in the browser; the HTML-table-saved-as-
  `.xls` case (a real V1.04.1 fix) is re-implemented via the browser's native `DOMParser`.
- **Add Description Clipboard Paste** (`AddDescriptionDialog.tsx`) - previously Upload/Drag & Drop
  only. Prefers the clipboard's `text/html` payload (Excel always includes one, and it survives a
  literal tab/newline inside a DESC cell), falling back to `text/plain` TSV - both converge on the
  same `resolveDescriptionRows`/`mergeDescription` pipeline as Upload/Drag & Drop, so all three
  input methods produce identical results for the same data.
- `frontend/lib/converter/regression.test.ts` - loads three real fixture files (`.xlsx`, `.xls`,
  and a genuine Excel-COM-saved `.xls`) and asserts the JS engine's output matches a JSON snapshot
  generated directly from the Python `ExcelTransformer` (`backend/scripts/dump_transform_json.py`),
  row-for-row and field-for-field, not just spot-checked.
- `.github/workflows/deploy-pages.yml` - type-check/lint/test, static export (`next build` with
  `output: "export"`), then publish to GitHub Pages on every push to `browser-edition`.

### Changed
- `frontend/lib/api.ts` rewritten to call the local Worker-based engine instead of `fetch`-ing a
  FastAPI backend - kept the exact same exported function signatures/response shapes (plus the new
  `addDescriptionFromClipboard`), so every existing caller (`HomeScreen.tsx`, `page.tsx`,
  `AboutDialog.tsx`) needed no changes beyond what this version explicitly adds.
- `AboutDialog.tsx` no longer shows a "Backend: FastAPI" row (there is no backend) - shows the new
  `EDITION` constant and a "Runs entirely in your browser" note instead.
- `next.config.mjs`: `output: "export"` + a conditional `basePath`/`assetPrefix` for GitHub Pages
  (`next dev` is unaffected).

### Fixed
- A latent bug caught while writing this version's own export path: SheetJS's
  `XLSX.write(..., { type: "array" })` returns a plain `number[]`, not a `Uint8Array`/
  `ArrayBuffer` - passed directly to `new Blob([...])` this silently isn't a valid Blob part.
  Wrapped in `new Uint8Array(...)` in `excelIO.ts`'s `rowsToXlsxBlob`, caught by its own new test
  before ever reaching a real export.

### Known limitations (disclosed, not fixed this version)
- This is a temporary release for user validation ahead of V2.0 - the V1.09 backend
  (`release/v1.09`) remains the production codebase; this branch does not modify it.
- Large files (~100,000+ rows) parse somewhat slower in the browser (SheetJS) than the V1.09
  backend's `python-calamine` reader did server-side - a disclosed trade-off, not optimized
  speculatively, per this version's own "measure before optimizing" principle.
- Debug Mode's peak-memory figure always reads 0 in this version - no standard, cross-browser
  equivalent of the backend's `psutil`-based memory sampling exists in a browser.
- Interactive browser testing (drag & drop, paste, Worker execution, file download) was verified
  via direct unit/regression tests and a dev-server boot check, not a live interactive browser
  session - no browser automation tool is available in this environment, same disclosed limitation
  as every prior version's code review.

## v1.09 - Support & Usability

### Release Notes

V1.09 focuses on reducing user confusion and making the app easier to support after deployment -
no new business features or conversion-logic changes, per its own spec. It fixes a real bug: Home
was supposed to fully reset the session, but the active Transformation Rule and a transient status
message could survive the reset, so a customized rule from a discarded session could silently
apply to an unrelated new conversion. Users can now back out of an accidental upload or paste
before converting (Remove / Clear), matching a pattern that already existed for large pastes.
The app is renamed to **RCC Excel Automation** across the browser title, header, Home screen,
README, and CHANGELOG. Unexpected errors now offer a **Show Log** action (timestamp, app version,
operation, error message/stack trace, environment info, one-click Copy Log, and a developer
contact) instead of just a generic message. A **Release Notes** page is now the primary in-app
place future updates get communicated. Full detail: [CODE_REVIEW_V1.09.md](./CODE_REVIEW_V1.09.md).

### Fixed
- **Home didn't fully reset the session.** `resetSession()` cleared the converted data (result,
  Add Description, search, Preview Rows) but left the active Transformation Rule and any pending
  status-bar message behind. Split into `resetSession()` (data only, used on every fresh
  conversion) and `resetToInitialState()` (data + the active rule reset to Default + status
  message cleared, used only when the user explicitly confirms Home) - the rule remains a
  persistent preference across conversions within a session (by design since V1.03), but Home
  itself now genuinely returns the app to its initial state. `frontend/app/page.tsx`.

### Added
- **Remove** (Upload panel) and the existing **Clear** (Paste panel) let a user discard an
  accidental selection before converting - both now show a "Selected File"/"Clipboard Loaded"
  card with the same visual pattern, applied consistently to `HomeScreen.tsx` and
  `AddDescriptionDialog.tsx`.
- **Error Log Viewer**: `ErrorBoundary`'s recovery screen gained a **Show Log** button opening
  `ErrorLogDialog.tsx` - timestamp, application version, operation, error message, stack trace,
  and environment info (user agent, viewport size), formatted as easy-to-copy plain text via
  **Copy Log**, with a developer contact (`jong10k.kim`). Never includes application data
  (PPID/excel content) - see `frontend/lib/errorLog.ts`.
- **Release Notes**: a new toolbar button (always visible) opens `ReleaseNotesDialog.tsx`, showing
  every version's New/Improved/Fixed/Known Issues from `frontend/lib/releaseNotes.ts` (most recent
  expanded by default). Future versions only need to add one entry there.
- `frontend/app/page.test.tsx` - a new regression test suite for `page.tsx` (previously untested
  despite being flagged as the largest stateful component in every review since V1.05),
  specifically reproducing the Home-reset bug and asserting the fix.
- Tests for the new Remove/Clear, Error Log Viewer, and Release Notes behavior across
  `HomeScreen.test.tsx`, `AddDescriptionDialog.test.tsx` (new - this component had no dedicated
  tests before), `ErrorBoundary.test.tsx`, `errorLog.test.ts` (new), and `ReleaseNotesDialog.test.tsx`
  (new).

### Changed
- Renamed "Excel Automation" to "**RCC Excel Automation**" - browser title, toolbar header, Home
  screen heading, About dialog, backend FastAPI title, README, CHANGELOG, and the one-click
  run/update/health-check scripts' console output.

### Known limitations (disclosed, not fixed this version)
- Abort remains client-side only (unchanged from V1.07/V1.08) - see Future Improvements in
  `CODE_REVIEW_V1.09.md`.
- The Transformation Rule shaping logic remains intentionally duplicated between
  `rule_manager.py`/`lib/rules.ts` (a reviewed trade-off documented in `CODE_REVIEW_V1.08.md`, not
  revisited this version since it's out of this release's scope).

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
