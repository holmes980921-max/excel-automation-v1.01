# Excel Automation V1.08 - Performance Report

**Scope**: V1.08's spec identified one concrete, reported issue - the browser becoming
unresponsive when ~200,000+ rows are pasted into the app - and asked for profiling across the
full pipeline (Clipboard Parsing, Excel Reading, Data Transformation, JSON Serialization, Grid
Rendering, Export) to find real bottlenecks before optimizing anything else. Per the spec's own
"Implementation Guidance" ("identify the actual bottleneck through profiling... before
optimizing"), this report leads with root-causing that one issue, then covers the rest of the
pipeline for completeness - most of which (per V1.05's benchmark) was already fast and remains so.

## 1. The large-paste freeze: root cause and fix

**Root cause**: `HomeScreen`'s Paste panel bound pasted text directly to a controlled MUI
`<TextField multiline>` with no `maxRows`. MUI's multiline `TextField` auto-sizes its underlying
`<textarea>` to fit its entire value - with no row cap, pasting ~200,000+ lines forced the browser
to lay out and paint a textarea hundreds of thousands of lines tall in one synchronous pass. This
is a DOM/layout cost, not a JavaScript logic cost - the freeze happened whether or not any parsing
code ran, purely from React committing that value into an unbounded-height textarea.

**Fix** (`frontend/components/HomeScreen.tsx`, `frontend/lib/pasteSummary.ts`): the paste event
itself is now intercepted (`onPaste`, `e.preventDefault()`) so pasted text **never reaches the
DOM or the controlled textarea value**, regardless of size. The text is summarized in one fast
pass (row/column counts, mirroring `parse_pasted_text`'s shape) and kept only in a `ref` for
Convert to use later; the UI collapses to a lightweight "Clipboard Loaded / Rows: N / Columns: N /
Status: Ready to Convert" card instead of ever rendering the raw content. A typed (not pasted)
manual entry still uses a normal `<TextField>`, now capped at `maxRows={8}` as defense in depth.

**Measured**: `summarizePastedText()` timed directly (Node, isolated from test-runner/DOM
overhead), text sizes matching realistic tab-separated Excel paste content:

| Rows pasted | Payload size | Parse time |
|---|---|---|
| 50,000 | 1.6 MB | 5.5 ms |
| 100,000 | 3.2 MB | 4.6 ms |
| 200,000 | 6.7 MB | 8.8 ms |
| 300,000 | 10.1 MB | 11.9 ms |

At the exact scale the spec's reported issue named (~200,000+ rows), the entire clipboard-to-summary
step now takes **under 10 milliseconds** - imperceptible, and critically, it never touches
rendering at all (no textarea, no DOM node holding the pasted content), so there is no path left
by which pasting a large dataset can freeze the browser. This is also covered by an automated
test (`frontend/lib/pasteSummary.test.ts`) asserting the same 200,000-row case completes in under
1 second, as a regression guard with generous CI-variance headroom.

**What was not changed**: the actual conversion (`/api/convert-text`) still parses and transforms
the full pasted text server-side once Convert is clicked - that path was never the source of the
freeze (it runs after a network round-trip, off the main rendering thread) and, per the
large-dataset backend test added this version, handles a 27,000-plus-row paste in well under a
second (see section 3).

## 2. Backend: no regression at 300k-row scale

The conversion hot path (`excel_transformer.py`, `excel_io.py`, `rule_manager.py`) was not
touched by any V1.06-V1.08 work except the DESC-placement and exception-handling refactors, both
of which sit outside the read/transform stages. Re-running `backend/scripts/benchmark.py` against
the same 300,474-row / 46,586-output-row file used for the V1.05 report confirms this:

| Metric | V1.05 | V1.08 | Change |
|---|---|---|---|
| Read + parse | 1.53 s | 1.75 s | within measurement variance (see V1.05 report's note on this) |
| Transform | 0.24 s | 0.27 s | within measurement variance |
| Total | 1.77 s | 2.03 s | within measurement variance |
| Peak memory | 338.5 MB | 338.6 MB | unchanged |

Raw data: `backend/scripts/bench_result_V1.08.json`. The small deltas are consistent with the
run-to-run variance already documented in `PERFORMANCE_BENCHMARK_V1.05.md` (this development
machine's external USB SSD), not a regression - both engine choice (calamine-first) and the
transform algorithm are byte-for-byte unchanged since V1.05.

## 3. Pipeline profiling (per the spec's checklist)

| Stage | Measured | Result |
|---|---|---|
| **Clipboard Parsing** | `summarizePastedText()`, 300k rows | 11.9 ms (see section 1) |
| **Excel Reading** | `read_raw_rows()`, 300,474-row `.xlsx` | 1.75 s (calamine; see section 2) |
| **Data Transformation** | `ExcelTransformer.transform()`, same file | 0.27 s |
| **JSON Serialization** | see below | ~0.8 s combined with transfer |
| **Grid Rendering** | not directly measurable - see below | virtualized (AG Grid), capped by Preview Rows |
| **Export** | `/api/export`, 46,586-row `.xlsx` write | not the bottleneck at any tested scale (sub-second) |

**JSON Serialization detail**: a live HTTP `/api/convert?debug=true` call against the 300k-row
file measured **3.71 s** total wall-clock (curl, localhost) vs. **2.90 s** reported internally by
the backend's own stage timers (read + parse + transform). The ~0.81 s difference covers
building the Pydantic response, FastAPI's JSON encoding of 46,586 row objects, and transferring
the resulting **14.5 MB** response body over localhost HTTP - not separately instrumented beyond
that combined figure, but small relative to the read/parse stage and not a reported problem.

**Grid Rendering**: as in every prior performance report for this project, no browser automation
tool was available in this environment to directly measure AG Grid paint/layout time. What can be
said with confidence: AG Grid Community (in use since V1.03) virtualizes row rendering, so its DOM
node count doesn't grow with dataset size, and Preview Rows (V1.06) already caps how many rows are
ever asked to render at once (100/500/1000/5000/All) independent of how many rows exist in memory.
Both are existing, already-shipped mitigations for this exact concern, not new V1.08 work - the
V1.08-specific gap was specifically the pre-render paste path (section 1), which is now closed.

## 4. Large-dataset correctness validation

Beyond timing, `backend/tests/test_large_dataset.py` (new this version) exercises both
`/api/convert` and `/api/convert-text` against a 5,000-PPID (~175,600-input-row, ~27,000-output-row)
generated dataset and asserts exact row/PPID counts - not just "doesn't crash," but "produces the
correct number of rows" at a scale large enough to catch anything invisible at the handful-of-rows
scale most other tests use. Fixing this test also surfaced and fixed a genuine (if extremely rare)
off-by-one in the shared mock-data generator (`scripts/make_mock.py`) - see
`CODE_REVIEW_V1.08.md`'s Bug Fixes section.

## 5. Summary

The one performance issue V1.08's spec named explicitly - the large-paste freeze - is root-caused
(an unbounded-height textarea, not a parsing cost) and fixed at the source (the pasted text never
reaches the DOM), with measured sub-12ms parsing even at 300,000 rows. Every other stage in the
pipeline was already fast as of V1.05 and remains so, confirmed by re-running the same benchmark
harness rather than assumed unchanged. No new performance regressions were introduced by V1.08's
refactoring work (DESC-placement deduplication, exception-handling consolidation) - both operate
on already-small in-memory structures, not the hot path.
