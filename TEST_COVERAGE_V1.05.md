# Excel Automation V1.05 - Test Coverage Report

## Backend (pytest + pytest-cov)

**37 tests, all passing. 88% line coverage** (`app/`, measured via `pytest --cov=app --cov-report=term-missing`).

| Module | Line Coverage | Notes |
|---|---|---|
| `models/constants.py`, `models/schemas.py` | 100% | Pure data definitions |
| `services/rule_manager.py` | 100% | Default identity, custom shaping, unknown-column/empty-rule fallbacks |
| `utils/perf.py` | 100% | Exercised indirectly via every routes.py test (`PeakMemorySampler`) |
| `services/excel_transformer.py` | 96% | TS# format, missing-value fill, dedup, unsupported-parameter handling |
| `utils/logging_config.py` | 95% | One unreachable branch (invalid category `ValueError`, not currently exercised) |
| `main.py` | 90% | Health/version endpoints covered; the global unhandled-exception handler itself isn't triggered by any test (would need a route that deliberately raises something unexpected) |
| `api/routes.py` | 83% | See "Untested" below |
| `utils/excel_io.py` | 80% | See "Untested" below |

**Tested**: `.xlsx`/`.xls`/HTML-masquerading-as-`.xls` detection and reading; calamine-vs-openpyxl/xlrd
byte-and-type equivalence (5 scenarios); extra-column and unsupported-parameter handling; the full
transformation engine's invariants (TS# format, `"-"` fill, no duplicates); rule shaping
(default/custom/unknown-column/empty-rule); all three HTTP endpoints' happy paths; garbage/empty/
oversized/wrong-extension upload rejection; malformed export payloads; Debug Mode's response shape.

**Untested / partially tested**:
- `api/routes.py`'s unexpected-exception branches (lines 137-139, 150-151, etc.) - the
  `except Exception` catch-alls that log and return a generic 500 are real code paths but nothing
  in the suite currently forces an *unexpected* (non-`InvalidExcelFormatError`) exception to
  exercise them.
- `utils/excel_io.py`'s calamine-fails-then-fallback-also-fails branch (lines 130-147) - the
  "both engines reject this file" path is logically covered by `test_detect_engine_rejects_garbage`
  at the `detect_excel_engine` level, but not through the full `_read_excel_binary` fallback chain
  with a file that trips calamine specifically.
- The `MAX_UPLOAD_SIZE_BYTES` path is tested for rejection, but not for a file just *under* the
  limit at realistic size (would be slow/wasteful to include in the routine suite).

## Frontend (Vitest + React Testing Library)

**25 tests, all passing.** Coverage (v8 provider, `npx vitest run --coverage`):

| File | Line Coverage |
|---|---|
| `components/StatusBar.tsx` | 100% |
| `lib/naturalCompare.ts` | 100% |
| `lib/uploadValidation.ts` | 100% |
| `lib/rules.ts` | 48% |
| **Overall (files touched by tests)** | **72%** |

**Note**: `components/ProcessingOverlay.tsx` has 5 passing tests (open/closed states, stage
progression via fake timers, ETA display) but doesn't appear in the v8 coverage table at all -
this looks like a coverage-provider instrumentation quirk with this Vitest/v8 combination rather
than a real gap (the tests genuinely exercise the component and would fail if its logic broke).
Worth a closer look in V1.06 rather than trusted blindly.

**Tested**: natural-sort comparator (TS#/PPID numeric-chunk ordering); upload rejection message
generation (wrong type, multi-file, unknown code); `lib/rules.ts`'s pure shaping functions
(`resolveDisplayColumns`, `normalizeForEditing`, JSON import/export round-trip, unknown-column
safety); `StatusBar`'s Ready/message/completion-stats/debug-metrics rendering; `ProcessingOverlay`'s
open/closed and stage-cycling behavior.

**Untested** (no component-level test exists yet):
- `RuleEditor.tsx` - the largest, most interactive component (drag-and-drop via dnd-kit,
  checkbox/alias editing, save/update/delete/import/export). Not covered at all.
- `ExcelGrid.tsx` - AG Grid wrapper; column-def generation from a rule is implicitly exercised via
  `resolveDisplayColumns`'s own tests, but the actual grid rendering/sorting/filtering isn't.
- `UploadDialog.tsx`, `AppToolbar.tsx`, `AboutDialog.tsx`, `AppProviders.tsx` - no tests.
- `lib/api.ts` - the fetch wrapper functions aren't unit-tested (would need `fetch` mocking).
- `lib/rules.ts`'s `localStorage`-backed functions (`saveRule`, `updateRule`, `deleteRule`,
  `listRules`, active-rule persistence) - only the pure/stateless functions are tested; anything
  touching `window.localStorage` is not, despite jsdom making this straightforward to add.

## Recommendations for V1.06

1. **Highest value**: add `localStorage`-backed tests for `lib/rules.ts` (save/update/delete/list) -
   jsdom supports this out of the box, and it's the single biggest coverage gap relative to how
   much logic lives there (only 48% covered today).
2. Add a `RuleEditor.tsx` component test suite (drag reorder can be tested via keyboard
   navigation, which dnd-kit supports and doesn't require simulating real mouse drag events).
3. Investigate why `ProcessingOverlay.tsx` doesn't appear in the v8 coverage table despite having
   passing, meaningful tests - confirm it's a tooling quirk and not a false sense of coverage.
4. Add backend tests that force the `except Exception` (non-`InvalidExcelFormatError`) branches in
   `routes.py` and the global handler in `main.py`, e.g. via dependency injection of a mock that
   raises an unexpected error type.
5. Promote this report's numbers into a coverage gate (e.g. "backend must stay >= 85%") once CI is
   introduced - V1.05's spec explicitly doesn't require CI yet, but the groundwork (`pytest-cov`,
   `@vitest/coverage-v8`) is now in place for whenever it is.
