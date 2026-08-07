# Excel Automation V1.08 - Test Coverage Report

## Backend (pytest + pytest-cov)

**67 tests, all passing. 94% line coverage** (`app/`, up from V1.07's 88% - measured via
`pytest --cov=app --cov-report=term-missing`).

| Module | Line Coverage | Notes |
|---|---|---|
| `api/error_handling.py` | 100% | New this version - directly unit-tested (5 tests covering every branch: expected rejection, explicit passthrough, unexpected with custom/default status+message) |
| `services/description_merger.py` | 100% | Now includes the shared `insert_column_after` reorder step |
| `services/rule_manager.py` | 100% | |
| `utils/df_helpers.py` | 100% | New this version - directly unit-tested |
| `utils/perf.py` | 100% | |
| `models/constants.py`, `models/schemas.py` | 100% | |
| `api/routes.py` | **97%** (up from 81%) | See below - the exception-handling consolidation is the reason this jumped |
| `services/excel_transformer.py` | 96% | Unchanged since V1.02 |
| `utils/logging_config.py` | 95% | One unreachable branch (invalid category), unchanged |
| `main.py` | 90% | Unchanged - the global handler itself still isn't directly triggered (see Untested) |
| `utils/excel_io.py` | 81% | Unchanged - see Untested |

**Why `routes.py` jumped from 81% to 97%**: V1.05-V1.07's routes.py had each route hand-roll its
own `try`/`except InvalidExcelFormatError`/`except Exception` block, and the `except Exception`
(unexpected-failure) branches were consistently the untested part - forcing a genuinely
*unexpected* exception through a full HTTP request is awkward to set up per-route. V1.08
extracted that policy into `handle_route_errors()` (`api/error_handling.py`) and tested it
**directly** (raise a bare `KeyError` inside the context manager, assert the resulting
`HTTPException`) instead of only indirectly through routes. This is a concrete example of
refactoring-for-testability actually paying off in the coverage numbers, not just in theory.

**Tested, new this version**: DESC-after-PPID column placement (merge output order, export order
with no rule, export order with an active *reordering* rule specifically); the shared
`find_insert_position`/`insert_column_after` helpers (anchor-present, anchor-absent-fallback,
never-mutates-input); the full two-tier error-handling policy in isolation; a large-dataset
correctness check (~175,600 input rows / ~27,000 output rows via both `/api/convert` and
`/api/convert-text`, asserting exact row/PPID counts, not just "didn't crash").

**Untested / partially tested** (same items V1.05's report already named, still open):
- `main.py`'s global unhandled-exception handler still isn't directly triggered by any test -
  every route-level exception is now caught by `handle_route_errors` before reaching it, which is
  correct behavior, but means the global handler itself (the very last line of defense) remains
  reasoned-through rather than test-proven.
- `utils/excel_io.py`'s calamine-fails-then-fallback-also-fails branch - unchanged from V1.05.

## Frontend (Vitest + React Testing Library)

**64 tests, all passing** (up from 52). Coverage (v8 provider, `npx vitest run --coverage`):

| File | Line Coverage |
|---|---|
| `components/HomeScreen.tsx` | 82% |
| `components/StatusBar.tsx` | 100% |
| `lib/naturalCompare.ts` | 100% |
| `lib/pasteSummary.ts` | 100% |
| `lib/uploadValidation.ts` | 100% |
| `lib/rules.ts` | 47% |
| **Overall (files touched by tests)** | **79%** |

**The "files missing from the coverage table" mystery is resolved this version - it was never a
bug.** V1.05, V1.06, and V1.07's reports each flagged a shifting set of files (different every
time - `ProcessingOverlay.tsx`, then `filename.ts`/`searchFilter.ts`, then `WorkflowBadges.tsx`/
`ReturnHomeDialog.tsx`/`AbortConfirmDialog.tsx`) that had passing tests but didn't appear in
`@vitest/coverage-v8`'s per-file table, and V1.07's report specifically recommended trying
`pool: "forks"` / disabling file parallelism to root-cause it. That was tried this version (via
`--no-file-parallelism`) and made **no difference** - ruling out a worker/merging bug. The actual
explanation, confirmed by running each "missing" file's test in isolation: **every one of them
achieves literal 100% coverage across all four metrics (statements/branches/functions/lines) with
zero uncovered lines** - `ErrorBoundary.tsx`, `WorkflowBadges.tsx`, `ReturnHomeDialog.tsx`, and
`AbortConfirmDialog.tsx` all confirmed 100%/100%/100%/100% in this version's own check. The v8
text reporter simply **omits fully-covered files with nothing left to flag from the per-file
breakdown**, rolling them into the aggregate summary total only - the same way it doesn't print an
"Uncovered Line #s" cell for a file with none. Three versions of "investigate this" are closed
with an actual answer instead of a fourth re-flag.

**Tested, new this version**: `HomeScreen.tsx`'s paste-conversion path (Convert enable/disable,
successful conversion, error handling, and - the large-dataset fix itself - pasting a large text
block shows the summary card instead of rendering it, Clear discards it, Convert still submits the
full original text); Abort actually cancelling an in-flight request and returning the app to a
clean, reusable state (no error toast, Convert re-enabled); `ErrorBoundary`'s catch-and-recover
behavior including the Return-to-Home navigation action; `pasteSummary.ts`'s row/column counting
including a 200,000-row timing regression guard (asserts under 1 second, generous CI headroom over
the ~9ms actually measured - see `PERFORMANCE_REPORT_V1.08.md`).

**Untested** (no component-level test exists yet, unchanged category of gap from prior reports):
- `RuleEditor.tsx`, `ExcelGrid.tsx`, `AppToolbar.tsx`, `AboutDialog.tsx`, `AppProviders.tsx`,
  `AddDescriptionDialog.tsx`, `LargeDatasetWarningDialog.tsx` - no dedicated tests.
- `HomeScreen.tsx`'s file-drop path specifically (its paste path is now tested - see above) -
  simulating a real `DataTransfer` drop event in jsdom was judged high-effort for low marginal
  confidence, same call V1.07's report made.
- `lib/api.ts`'s fetch wrapper functions - not unit-tested (would need `fetch` mocking).
- `lib/rules.ts`'s `localStorage`-backed functions - still only the pure/stateless functions are
  tested (flagged in every report since V1.05, still not picked up).

## Recommendations for V1.09+

1. `lib/rules.ts`'s `localStorage`-backed functions remain the single largest specific coverage
   gap relative to how much logic lives there (47%) - flagged in four consecutive reports now.
2. A `RuleEditor.tsx` test suite (dnd-kit supports keyboard-navigation-based reordering tests,
   which don't require simulating real mouse drag events).
3. A file-drop test for `HomeScreen.tsx` to close its one remaining gap (see above).
4. A test that forces `main.py`'s global exception handler itself to fire (something that throws
   past `handle_route_errors` entirely, e.g. a bug in FastAPI's own request-parsing layer) - low
   priority, since `handle_route_errors` now correctly intercepts everything within its scope, but
   the literal last line of defense is still unverified by a test.
