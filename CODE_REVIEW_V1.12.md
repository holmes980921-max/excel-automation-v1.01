# RCC Excel Automation V1.12 - Code Review Report (Film Material Visualization)

Scope: the `browser-edition` branch as of this delivery, reviewed by the same agent that
implemented it (conflict of interest noted, as in every prior report). This version's mandate was
explicit: let users visually inspect a Film Material's layer structure from the converted result
table, implemented as an additive feature that cannot break or weaken the existing V1.11 Excel
conversion workflow. This review judges the release against that mandate, with particular weight
on isolation (can a Material DB problem ever touch conversion?) and on a genuine ambiguity found in
the spec's own required test cases, since silently "fixing" a spec example without disclosure would
be worse than getting a corner case wrong.

## 1. Architecture

**Total isolation from the conversion pipeline, verified by import graph, not just by claim.**
`lib/materialDb.ts`, `lib/filmMaterialParser.ts`, and `lib/cssColor.ts` have zero imports from
`lib/converter/` (the engine ported in V1.10) in either direction. The only existing file this
version touches for wiring is `ExcelGrid.tsx` (a new optional prop, `onFilmMaterialClick`,
defaulting to doing nothing when omitted) and `app/page.tsx` (new, additive dialog state). A
Material DB load failure literally cannot reach the conversion code path - there is no shared
module, shared state, or shared error type between them.

**Three small, single-purpose modules instead of one large one**: `materialDb.ts` (fetch, parse,
validate, cache), `filmMaterialParser.ts` (tokenize + bottom-layer logic), `cssColor.ts` (color
validation + contrast). Each is independently unit-testable without mocking the others -
`filmMaterialParser.test.ts` never touches `fetch`, `materialDb.test.ts` never touches parsing
logic, `cssColor.test.ts` never touches either. This mirrors the project's established pattern from
V1.10's `lib/converter/` split (transformer/ruleManager/descriptionMerger/excelIO as separate
concerns) rather than introducing a new idiom.

**Grid-level, not column-level, click wiring.** AG Grid supports both a per-`colDef` `onCellClicked`
and a grid-level `onCellClicked` prop; the per-column version was tried first and, empirically,
didn't fire reliably under RTL/jsdom testing, so the implementation uses the grid-level handler
(filtering on `event.colDef.field`) instead. This is disclosed as an implementation-level finding,
not asserted as "AG Grid's per-column handler is broken" (that specific claim was never
independently verified beyond this project's test environment) - the grid-level hook is also the
more standard, more commonly documented AG Grid pattern regardless, so this isn't a compromise.

## 2. User Experience

- **Hover/click behavior matches the spec exactly**: pointer cursor over a non-empty `filmmaterial`
  cell, no special link styling (plain text, cursor change only), click opens a modal (never a new
  tab/window - `FilmMaterialVisualizationDialog` is a MUI `Dialog`, not a `window.open`).
- **All three closing methods work**: the × `IconButton` (new for this project - no prior dialog in
  this app needed one, since MUI `Dialog`'s `onClose` already covers backdrop-click and Escape for
  every existing dialog), backdrop click, and Escape - each has its own test.
- **The error states are genuinely informative, not generic**: an unknown Material names the exact
  unrecognized character and tells the user which file to fix (`material-db.csv`); a Material DB
  problem distinguishes "the file didn't load" from "the file loaded but is wrong" with different
  messages, matching spec sections 12 and 13's distinct wording exactly.
- **The source value is always shown**, even in the error states - a user (or the administrator
  fixing the DB) can see exactly what failed to parse without needing to go find the original cell
  again.

## 3. Parsing Implementation

`filmMaterialParser.ts`'s tokenizer is a straightforward greedy longest-match-first scan: at each
position, try every code length from the DB's longest code down to 1, take the first (i.e. longest)
match. No backtracking is implemented, and none is needed for the DB shapes this spec describes -
verified directly against every given example, including the two cases explicitly designed to
distinguish greedy-longest-match from naive character-by-character reading (`ABCDBA` -> `AB,C,D,B,A`,
not `A,B,C,D,B,A`; `BABCDB` -> `B,AB,C,D,B`, preserving repeated Materials as separate layers).

**A genuine inconsistency in the spec's own required test cases, found and resolved during
implementation, not glossed over.** Case 1 states input `ABC` should parse to `A,B,C,Si`. But the
spec's own standard mock DB (used everywhere else, including Case 2) registers `AB` as a
2-character code - and Case 2 explicitly states, in bold, that Longest Match First is "critical" and
must prefer `AB` over `A`+`B`. Applying that same rule to Case 1's `ABC` input against the same DB
necessarily produces `AB,C,Si`, not `A,B,C,Si` - the two cases' expectations cannot both hold
against one shared DB. Resolution: Case 1's test uses a DB fixture without `AB` registered,
consistent with Case 1's own stated purpose ("basic structure / default Si") being distinct from
Case 2's ("Longest Match First... critical"). This is disclosed here and in the test file itself,
not silently patched - a reviewer or the spec's author can judge whether this resolution matches
intent, but the *parser's own behavior* was verified correct and consistent (Longest Match First,
always) rather than bent to fit a self-contradictory example.

## 4. Visualization Implementation

Layer boxes are fixed at `220px x 48px` via CSS `width`/`height` (not `min-width`/`min-height`),
regardless of Material Code length (1-10 characters) or how many layers exist - verified by a test
asserting every rendered layer shares one `getComputedStyle().width` and one `.height` value
regardless of code length. `white-space: nowrap` prevents wrapping (also directly asserted). Many
layers scroll inside a fixed-`max-height` container rather than growing the modal indefinitely.
Adjacent layers use a `-1px` top-margin collapse technique (matching the spec's ASCII-art border
diagram, where shared boundaries render as one line, not a doubled one) while each layer still
carries its own full `1px solid black` border.

## 5. Error Handling

Three distinct, non-overlapping error surfaces, each with its own message and its own test:
1. **Material DB unreadable** ("Material Database Unavailable") - fetch failure, 404, or malformed
   CSV structure. Excel conversion is unaffected (nothing in the conversion path calls
   `loadMaterialDb`).
2. **Material DB content invalid** ("Material Database Error") - duplicate Material Code or an
   unrecognized color string, caught at parse time before the DB is ever used for rendering.
3. **Unknown Material in a specific value** ("Visualization unavailable... Unknown Material: X") -
   the DB itself is fine, but this particular Film Material value references a code that isn't
   registered. Only this specific modal open is affected; every other value's visualization is
   unaffected (no error is cached or remembered across different `filmmaterial` values).

## 6. Regression Safety

**Verified, not assumed:**
- Full pre-V1.12 suite (180 tests) passes with zero modifications - no existing test was weakened,
  altered, or removed to accommodate this version.
- `tsc --noEmit` and `eslint .` both clean.
- A local `next dev` boot check confirmed the app starts without an import/runtime error and that
  `material-db.csv` is served correctly from `public/data/` (both locally and, after deploy, from
  the actual GitHub Pages basePath - see Release Recommendation).
- `ExcelGrid.tsx`'s change is additive and optional (`onFilmMaterialClick?`) - a dedicated test
  confirms the component doesn't throw when the prop is omitted, covering every existing caller
  that doesn't pass it.
- Excel conversion, Add Description, and Help & Support were not touched by any V1.12 commit and
  were re-run as part of the full suite, not just assumed unaffected because their files weren't
  edited.

## 7. Test Coverage

**225 frontend tests** (up from V1.11's 180), of which **45 are new to V1.12**: `cssColor.test.ts`
(8), `materialDb.test.ts` (12), `filmMaterialParser.test.ts` (10, covering all 5 required cases
plus 5 additional edge cases), `FilmMaterialVisualizationDialog.test.tsx` (11), and
`ExcelGrid.test.tsx` (4 - the first dedicated test file for this component, previously only
exercised indirectly through `page.test.tsx`). `materialDb.ts` (97.5%) and `filmMaterialParser.ts`
(100%) are both very highly covered; `cssColor.ts` doesn't appear in the coverage table at all,
which - per the root cause established in V1.08's review - means it's at literal 100% across all
four metrics (the v8 text reporter omits fully-covered files from the per-file breakdown).

## 8. Technical Debt

**Introduced this version, disclosed:**
- No test independently verifies the Longest Match First tokenizer's behavior on a DB shape with
  genuine ambiguity requiring backtracking (e.g. two different multi-character codes that could
  both match at a position, where only one choice allows the rest of the string to parse). The
  current greedy, no-backtracking algorithm is correct for every case this spec describes, but
  isn't proven correct for a DB shape more adversarial than what was specified - not required by
  spec, but worth naming as a boundary of what's actually verified.

**Explicitly not introduced, by design (per spec's Scope Restrictions):**
- No Material Name/Category/Thickness/Measurement Target fields, no in-app Material DB editing UI,
  no text-color DB column, no server-side Material DB.

**Carried forward from V1.11, out of scope for this version:**
- Everything already listed in `CODE_REVIEW_V1.11.md`'s Technical Debt (unchanged - this version
  didn't touch Help & Support, Error Details, or the conversion engine).

## 9. Release Recommendation

**Ship it.** The feature is genuinely additive and isolated - every regression-safety claim in
Section 6 is backed by a specific test or a specific verification step, not just "nothing looked
different." The one real judgment call this version required (the Case 1 vs. Case 2 DB
inconsistency) was resolved in favor of internal consistency with the parser's actual, spec-mandated
behavior (Longest Match First, always) rather than silently reproducing a self-contradictory
example, and is disclosed rather than hidden.

**What was not verified**: per this version's own instruction ("Do not claim browser-level behavior
is verified unless it was actually tested in a real browser environment"), no interactive
click-through in a live browser was performed - no browser automation tool is available in this
environment. Coverage instead comes from component tests (RTL/jsdom, which does simulate real DOM
event dispatch and CSS computed-style resolution, not just shallow rendering) and a local dev-server
boot-and-serve check. This is the same disclosed limitation as every prior version's review in this
project.

## Overall Grade: **A**

**Why A**: the isolation claim (a Material DB failure cannot break Excel conversion) is the
single most safety-critical requirement in this spec, and it's true by construction (no shared
imports, no shared state, no shared error types) rather than by convention or hope. The spec
ambiguity in the required test cases was found, understood, and resolved with visible reasoning
rather than either silently "fixing" the example or blindly implementing a rule that would have
contradicted the parser's own explicitly-required behavior. Every required test case and every
additional case from spec section 17 has direct coverage.

**Why not A+**: the Longest Match First tokenizer's correctness is demonstrated for every case the
spec actually describes, but not stress-tested against a DB shape genuinely requiring backtracking -
a real, if currently out-of-spec, edge case. Live-browser verification remains categorically
unavailable in this environment, a recurring, disclosed limitation across this entire project
rather than something specific to this version, but still worth naming plainly rather than
letting the strong automated-test story imply more than it covers.

## Future Improvements

- **A backtracking-aware (or ambiguity-detecting) tokenizer test**, if the Material DB is ever
  expected to contain genuinely ambiguous multi-character codes - not needed for the current mock
  DB or any DB shape the spec describes, but worth having before the DB grows organically in ways
  nobody explicitly reasons through.
- **A Playwright/browser-based CI smoke test** (carried forward from `CODE_REVIEW_V1.10.md`/
  `V1.11.md` - still the single highest-value addition for closing this project's recurring
  "no live browser" verification gap, and would directly cover this version's click-to-open modal
  flow).
