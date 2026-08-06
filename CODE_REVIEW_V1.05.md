# Excel Automation V1.05 - Code Review Report

Scope: the full application as of `release/v1.05`, reviewed by the same agent that implemented
it (conflict of interest noted, as in the V1.04 report - this tries to say what a skeptical
outside reviewer would say). Read alongside `CODE_REVIEW_V1.04.md` for what carried over.

## 1. Architecture Review

Unchanged at the top level from V1.04's assessment: **API → Services → Models/Utils** on the
backend, a single stateful `page.tsx` on the frontend. V1.05 adds two new layers that fit
cleanly into this shape rather than cutting across it:

- `utils/perf.py` (`PeakMemorySampler`) and `utils/logging_config.py` (category loggers) are
  genuinely reusable utilities, not route-specific code - `scripts/benchmark.py` now imports
  `PeakMemorySampler` from the app instead of duplicating it (this was itself a fix: V1.05 started
  with two copies and consolidated them during implementation).
- The calamine-with-fallback design in `excel_io._read_excel_binary` is a good pattern: a fast
  path that's been validated equivalent, with an automatic, tested fallback to the
  previously-shipped behavior for anything outside that validation. This is the kind of
  reliability-conscious architecture the V1.05 spec asked for, not just a drop-in library swap.

**What's still true from V1.04's review**: the rule-shaping duplication between
`backend/app/services/rule_manager.py` and `frontend/lib/rules.ts` was flagged as technical debt
and was **not** addressed this version (out of scope for a performance/reliability release, but
worth restating so it doesn't get forgotten).

**New in V1.05**: `frontend/lib/version.ts` hardcodes `GIT_TAG`/`BUILD_DATE` as hand-maintained
constants for the About dialog. This satisfies the spec (which explicitly doesn't require CI/CD
yet) but is a manual-maintenance liability - nothing enforces these get updated at release time,
and a stale About dialog is a believable, low-severity bug waiting to happen.

## 2. Performance Review

See `PERFORMANCE_BENCHMARK_V1.05.md` for full methodology and numbers. Summary: **8.6x faster**
end-to-end at 300k input rows (15.24s -> 1.77s), driven almost entirely by adopting
`python-calamine` for reading (validated byte-and-type-identical to the previous engines across 6
scenarios before being adopted, per explicit instruction) and by eliminating a wholly unused
xlsx-write-and-base64-encode pass that ran on every single conversion regardless of whether the
user ever downloaded anything.

The one place this review pushes back on itself: peak memory **increased** ~19% (285 MB -> 338
MB), the opposite of the "reduce peak memory usage" objective taken at face value. The benchmark
report explains the trade-off and why it was judged acceptable (absolute numbers are still small;
a slow blocking request is a worse practical problem than the memory delta); a genuinely
memory-constrained deployment could flip the default back to the openpyxl fallback path with a
one-line change, since that path is already implemented and tested. This is a real, disclosed
trade-off, not a hidden regression - but it's fair to note the objective wasn't met literally as
written.

## 3. Reliability Assessment

Materially improved over V1.04:
- A file-size cap (`MAX_UPLOAD_SIZE_BYTES`, 250 MB) now exists where none did before - closes a
  real crash/OOM risk that the V1.04 review flagged explicitly.
- Every route now has both a narrow `except InvalidExcelFormatError` (expected, 400) and a broad
  `except Exception` (unexpected, 500 with a generic client-facing message + full server-side log)
  - plus a global FastAPI exception handler as a second line of defense for anything that still
    slips through a route's own handling. This is real defense-in-depth, not just one added
    try/except.
- The calamine-with-fallback read path (see Architecture) is itself a reliability improvement,
  independent of its performance benefit: a file that trips up one engine now gets a second
  attempt instead of an immediate failure.

**Gap**: as the Test Coverage Report notes, none of the new `except Exception` branches or the
global handler are actually exercised by a test that forces a genuinely unexpected exception.
They exist and are reasoned-through correctly, but "this code path exists and looks right" is a
weaker claim than "a test proves this code path works," and V1.05's own stated principle
("write code that is easy to test... new functionality should include automated tests whenever
practical") wasn't fully lived up to here.

## 4. Code Quality

Continues the pattern from V1.04: full type hints, docstrings that explain *why* not *what*, no
bare excepts. `pyflakes`-clean (spot-checked; not re-run exhaustively this session). The frontend
gained a genuine testability improvement: `describeRejection`/`ACCEPTED_FILE_TYPES` were extracted
from `UploadDialog.tsx` into `lib/uploadValidation.ts` specifically so they could be unit-tested
without mounting a component - a small but real example of the "write code that is easy to test"
principle actually changing a design decision, not just being stated.

ESLint is still not configured (same gap noted in V1.04's review - `next lint`'s interactive setup
still can't be driven non-interactively in this environment). `tsc --noEmit` remains the only
automated frontend correctness gate beyond the new Vitest suite.

## 5. Maintainability

The benchmark harness (`scripts/benchmark.py`) and the equivalence test
(`tests/test_calamine_equivalence.py`) are both genuinely reusable artifacts, not one-off scripts
thrown away after use - a future engine change or performance regression has a ready-made way to
be caught. The structured logging categories (`application`/`error`/`performance`/`debug`) give
future debugging a real head start over V1.04's plain unstructured log lines.

The `DebugInfo`/`debug_extra` plumbing through `routes.py` (a mutable dict passed into
`read_raw_rows` to be populated conditionally) is the least elegant part of this release's backend
code - functional and tested, but a mutable-out-parameter pattern that a strongly-typed language
would usually avoid. A small `NamedTuple`/dataclass return value would read more cleanly. Not
worth blocking the release over, but worth a note for whoever touches this next.

## 6. Security Review

No change to the security posture described in V1.04's review (no auth, no persistence, CORS
locked to localhost:3000, no XSS-risk rendering paths). The new file-size limit is itself a small
security improvement (bounds a DoS vector that previously had no bound). No new attack surface was
introduced: calamine parses the same untrusted input openpyxl/xlrd already did, through the same
validated-then-defaulted code path.

## 7. Technical Debt

Carried over from V1.04 (still unresolved): no CI/CD (explicitly out of scope for V1.05), rule-
shaping duplication between backend/frontend, `next build` still fails on this specific
development machine (re-confirmed this session - same `EISDIR` error, environment-specific per
`env-windows-bash-quirks` memory, not a code issue; `tsc --noEmit` + `next dev` remain the
verification path used instead).

New in V1.05:
- Hand-maintained `GIT_TAG`/`BUILD_DATE` constants (see Architecture) - should be build-time
  injected once CI exists.
- The mutable-dict debug-info pattern in `routes.py` (see Maintainability).
- Untested exception branches (see Reliability).
- `ProcessingOverlay`'s progress is honestly simulated (stage-text cycling on a timer + an
  indeterminate bar), not real server-reported progress - correct and disclosed per spec's
  "indeterminate when exact progress cannot be calculated" allowance, but worth remembering this
  is not a real progress signal if a future version is tempted to treat it as one.

## 8. Test Coverage Assessment

See `TEST_COVERAGE_V1.05.md` for the full breakdown. Headline: **backend 88% line coverage (37
tests), frontend 72% on touched files (25 tests)** - both genuinely new this version (V1.04 had
zero automated tests of either kind, which was that report's central complaint). The biggest
remaining gaps are `lib/rules.ts`'s `localStorage`-backed functions (only the pure functions are
tested) and no component-level tests yet for `RuleEditor.tsx` or `ExcelGrid.tsx`, the two most
complex frontend components.

## 9. Performance Benchmark Summary

8.6x faster (15.24s -> 1.77s), 8.6x higher throughput (19,713 -> 169,409 rows/sec), at the
300,000-input-row target scale. Peak memory +19% (285 MB -> 338 MB), a disclosed trade-off in
exchange for the speed improvement. Full detail in `PERFORMANCE_BENCHMARK_V1.05.md`.

## 10. Release Recommendation

**Ship it.** V1.05 does what it set out to do: the app now handles the target 300k-row scale in
under 2 seconds instead of 15+, has a real (if not exhaustive) automated test foundation where
there was none, has meaningfully better error handling and a closed DoS vector, and has a
genuinely simpler default UI without removing any functionality. The memory trade-off and the
carried-over technical debt (no CI, rule-shaping duplication) are disclosed, not hidden, and none
of them block the stated goal of "engineering quality, not new features."

## Overall Project Score: **A-**

**Why up from V1.04's B+**: the single biggest item blocking an A last time - no automated test
suite - is now substantially addressed (88%/72% real, measured coverage, not just careful manual
verification). The performance work was rigorous: a real baseline was captured before touching
code, an optimization that looked promising (`read_only=True`) was measured and found to
underdeliver rather than assumed to work, and the library swap that actually delivered the target
was validated for correctness *before* being adopted, exactly as instructed - with a working
fallback, not a leap of faith.

**Why not A/A+**: the memory objective was not met as literally stated (it regressed, even if for
a defensible reason); the new reliability code paths (broad exception handlers) aren't yet proven
by tests, only by code review; and real, previously-identified technical debt (rule-shaping
duplication, no CI) persisted through another release without a decision to explicitly defer it
being written down anywhere before now. These are all disclosed and reasoned-through rather than
hidden, which is why this isn't a B - but "disclosed" isn't the same as "fixed."

**What would move this to A**: a follow-up pass resolving the rule-shaping duplication, tests that
actually trigger the new exception-handling branches, and either a genuine memory-conscious mode
(configurable, not just theoretically possible) or an explicit written decision that speed is
permanently prioritized over the original memory objective for this app's usage profile.
