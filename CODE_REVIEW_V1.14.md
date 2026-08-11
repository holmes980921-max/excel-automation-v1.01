# RCC Excel Automation V1.14 - Code Review Report (Pre-PPID Data Extraction & User-Friendly Converted Output)

Scope: the `browser-edition` branch as of this delivery, reviewed by the same agent that
implemented it (conflict of interest noted, as in every prior report). This version's mandate was
narrow and explicit: add two new Converted Output columns (`PreProcess`/`ReferenceTestPathName`,
shown as `CB-Pre-PPID`/`DFF-Pre-PPID`) by reusing the existing TS# matching logic, with one new
post-processing rule (last-backslash extraction) - and nothing else. This review judges the release
against that mandate, with particular weight on whether "reuse, don't duplicate" was actually
achieved in the diff, not just claimed in prose.

## 1. Architecture

**The TS# matching engine required zero code changes.** `lib/converter/transformer.ts`'s core loop
was already fully generic: it groups raw `TS#<n>_<field>` rows by field name with no hardcoded
field list, then iterates whatever is in `OUTPUT_COLUMNS` (itself derived from `lib/rules.ts`'s
`BASE_COLUMNS`). Adding `"PreProcess"` and `"ReferenceTestPathName"` to `BASE_COLUMNS` was
sufficient, by itself, for the engine to start correctly extracting `TS#N_PreProcess`/
`TS#N_ReferenceTestPathName` at the right TS# - verified directly (Section 5), not assumed from
reading the code.

**The one genuinely new piece of logic is isolated in its own module.** `lib/converter/
lastPathSegment.ts` exports a single pure function (`extractLastPathSegment`) and the two-field
set it applies to (`LAST_SEGMENT_FIELDS`) - `transformer.ts`'s per-column loop gained exactly one
new line (`if (LAST_SEGMENT_FIELDS.has(col)) value = extractLastPathSegment(value)`), scoped so
narrowly it cannot affect any other field's value, ever, by construction (a `Set.has()` check, not
a broader conditional that could accidentally widen).

**The default-header rename reuses the existing alias mechanism instead of adding a new one.**
`lib/rules.ts` already had `TransformationRule.aliases` (user-set, per-rule) as the single
mechanism controlling internal-name-to-display-header. Rather than inventing a second "renamed
column" concept, `DEFAULT_COLUMN_HEADERS` is a small fallback map consulted only when no explicit
alias is set - `header: rule.aliases[field]?.trim() || DEFAULT_COLUMN_HEADERS[field] || field`. A
user can still override `CB-Pre-PPID` to anything else via the existing Rule Editor, unchanged.
This same fallback had to be added in two places (`lib/rules.ts`'s `resolveDisplayColumns` for the
Preview grid, `lib/converter/ruleManager.ts`'s `applyRule` for export) - not a new duplication
introduced by this version, but the same **already-accepted, already-documented** trade-off this
project has carried since V1.08/V1.10 (preview needs synchronous client-side shaping, export needs
authoritative server-equivalent shaping) - kept in sync manually, exactly as the existing code
already was for every other alias.

## 2. Behavioral Correctness (Section 5/8/9/11 of the spec)

- **TS# isolation verified directly, not assumed**: a dedicated test constructs `TS#1_PreProcess`,
  `TS#2_PreProcess`, `TS#3_PreProcess` (and the `ReferenceTestPathName` equivalents) in one input
  and asserts the `TS#2` output row uses only the `TS#2_*` values - this is the exact adjacent-TS#
  contamination risk the spec's Test 7 calls out, and it's excluded structurally (the raw rows are
  grouped into a `Map<PPID, Map<tsNum, fields>>` before any field is read, so there is no code path
  by which a TS#3 value could leak into a TS#2 row).
- **Last-backslash extraction matches the spec's own worked examples exactly**:
  `%%%%\%%\%%%%\QWEDWQASJ_2` -> `QWEDWQASJ_2`, `AAAA\BBBB\PATH_003` -> `PATH_003`, and a
  no-backslash value (`PRE_PROCESS_01`) is left untouched - all three asserted directly, plus the
  full end-to-end example from spec Section 15.
- **Missing-field behavior is byte-identical to every existing field**, because it's the *same*
  code path (`col in fields ? fields[col] : MISSING_VALUE`) - not a reimplementation that merely
  behaves the same. A field present for one TS# but absent for another (spec Section 7's example)
  is covered directly.
- **Edge cases (trailing `\`, consecutive `\\`) don't throw**, verified with a dedicated test -
  `"TRAILING\\".slice(lastIndexOf("\\")+1)` correctly produces `""` rather than raising, and
  `"DOUBLE\\\\SLASH"` correctly extracts `"SLASH"` (the text after the *last* backslash, consistent
  with the spec's stated rule even though this exact input shape "is not expected"). No special
  business logic was added for these cases, per the spec's explicit "do not over-engineer"
  instruction - the function is just naturally total (never throws) over any string input.

## 3. Output Schema & Column Width

- **Exact 11-column order verified against the spec's own table**, not just "columns present":
  a dedicated test asserts both the `field` order and the `header` order emitted by
  `resolveDisplayColumns(DEFAULT_RULE)` match the spec's numbered list (`PPID, TS#, CardName,
  FilmMaterial, CorrelationCard_1, CorrelationCard_2, CorrelationCard_3, DataCombination,
  CB-Pre-PPID, DataFeedFoward, DFF-Pre-PPID`) exactly - including that `PreProcess` sits *between*
  `DataCombination` and `DataFeedFoward`, not appended at the end, which is easy to get wrong with
  a naive "just push the new fields" approach.
- **Existing column names are unchanged** - confirmed by the same test (every field/header pair
  for the original 9 columns is identical to before) and by `git diff`-level inspection: no
  existing entry in `BASE_COLUMNS` was renamed, reordered relative to each other, or removed.
- **The header-wrap fix addresses a real, verified CSS gap, not a hypothetical one.** Grepping the
  actual shipped `node_modules/ag-grid-community/styles/ag-grid.css` (the same technique this
  project used to root-cause the V1.04.1 zebra-striping bug) found `.ag-header-cell-text` sets
  `word-break: break-word` with **no** `white-space: nowrap` at all - meaning a long header
  genuinely can wrap onto a second line if its column is narrow enough, not a theoretical concern.
  Fixed two ways: a general `white-space: nowrap` CSS rule (safe for every column, since no
  existing header was ever long enough to have wrapped, so nothing about their behavior changes)
  plus a per-field `COLUMN_MIN_WIDTH_OVERRIDES` map giving `CB-Pre-PPID`/`DFF-Pre-PPID` (11/12
  characters) a wider default `minWidth` than the existing 90px floor, without touching any
  existing column's width.
- **What this review could *not* verify**: jsdom performs no real CSS layout, so no test in this
  environment can measure an actual rendered pixel width or observe genuine visual wrapping.
  Coverage instead comes from three angles that together are the closest approximation available
  without a browser: (1) the CSS source itself, read directly, contains the fix; (2) the width
  override values are asserted directly and are proportionate to the header text length; (3) the
  grid renders the full, untruncated header text as a DOM node (`findByRole("columnheader", {
  name: "CB-Pre-PPID" })`) without truncation at the React/DOM level. None of these three actually
  prove the pixels don't wrap in a real browser - disclosed plainly, not overstated.

## 4. Regression Safety

**Verified, not assumed:**
- Full suite: **255 tests, all passing** (up from V1.13.1's 237, 18 new).
- `frontend/lib/converter/transformer.ts`'s TS# grouping/matching logic is unchanged except for
  the one new, narrowly-scoped extraction line (Section 1) - the existing `transformer.test.ts`
  tests for `CardName`/`FilmMaterial` missing-field and out-of-range-TS# behavior all still pass
  unmodified.
- `RuleEditor.tsx` was not touched at all - it already renders `draft.column_order` generically,
  so the two new fields appear in it automatically with no special-casing needed, and every
  existing Rule Editor test continues to pass unmodified.
- `lib/converter/regression.test.ts` (Python-vs-JS parity) needed a scoping change, not a
  weakening: the Python V1.09 backend does not and will not produce `PreProcess`/
  `ReferenceTestPathName` (confirmed by reading `backend/app/models/constants.py`'s
  `OUTPUT_COLUMNS`, which the spec's own framing already implied is intentionally frozen), so
  comparing those two columns against a Python snapshot that structurally cannot contain them would
  be comparing against nothing - the per-column parity loop was scoped to
  `PYTHON_COMPARABLE_COLUMNS` (the original 9), and every one of those 9 columns' parity assertions
  is completely unchanged and still passes against the same fixture files. A new, separate
  assertion was added confirming the two new columns are present and consistently `MISSING_VALUE`
  on that same real (pre-V1.14) fixture data - a real-data sanity check, not a parity claim.
- `tsc --noEmit` and `eslint .` both clean.
- `lib/materialDb.ts`, `lib/filmMaterialParser.ts`, `lib/cssColor.ts`, `HomeScreen.tsx`,
  `AddDescriptionDialog.tsx`, and every V1.13/V1.13.1 clipboard-only behavior were not touched by
  any V1.14 commit.

**Disclosed, not silently absorbed:**
- Two existing tests (`rules.test.ts`'s "every column's header equals its field name" assertion,
  `ruleManager.test.ts`'s "Default rule headers equal `FULL_OUTPUT_COLUMNS`" assertion) had literal
  expectations that were only ever true because no column had a default-renamed header before this
  version - both were updated to state the new, correct exception (the two V1.14 fields) explicitly,
  not loosened to stop checking the underlying property. `rules.test.ts`'s and `normalizeForEditing`'s
  "9 base columns" counts became "11" for the same, mechanical reason (`BASE_COLUMNS` actually grew).

## 5. Testing Notes

Deliberately favored **synthetic, hand-constructed input** in `transformer.test.ts` for the
TS#-isolation and backslash-extraction tests (spec Tests 1-7) over relying on the real fixture
files, because the real fixtures (generated by `backend/scripts/make_mock.py`, confirmed by reading
its `FIELDS` list) never contain `TS#N_PreProcess`/`TS#N_ReferenceTestPathName` data at all - a
real-fixture-only test would only ever exercise the missing-field path, never the actual extraction
logic. The real fixtures are still used, in `regression.test.ts`, but for what they can actually
prove: that the new columns don't break parity for the fields Python *does* produce, and that they
consistently resolve to `MISSING_VALUE` on data that genuinely has no matching source field.

## 6. Technical Debt

**Introduced this version, disclosed:**
- The default-header fallback (`DEFAULT_COLUMN_HEADERS`) had to be added in two places
  (`lib/rules.ts` and `lib/converter/ruleManager.ts`) rather than one, because those two files
  already duplicate alias-resolution for the reasons documented since V1.08/V1.10 (synchronous
  client-side preview vs. authoritative export shaping). This version didn't introduce that
  duplication - it's a second instance of an already-accepted trade-off - but it is a second place
  a future header-related change now needs to remember to touch.
- A pre-existing custom Transformation Rule (saved before V1.14) will not automatically enable the
  two new columns - `normalizeForEditing`'s existing "append missing known columns, disabled by
  default" behavior applies unchanged. This is the correct, unsurprising consequence of how the
  rule system has always worked (a rule's `output_columns` is an explicit opt-in list), not a new
  gap introduced here, but worth naming since it's the first time in this project's history that
  `BASE_COLUMNS` has grown after a user could plausibly have an existing saved custom rule.

**Explicitly not introduced, by design (per spec's Scope Restrictions):**
- No server migration, auth, permissions, new Material DB architecture, new Film Material parsing
  rules, changes to Clipboard-only input, changes to Add Description UX, or unrelated UI redesign.

**Carried forward from V1.13.1, out of scope for this version:**
- Everything already listed in `CODE_REVIEW_V1.13.md`'s addendum (unchanged - this version didn't
  touch Conversion Input, Add Description, Help & Support, or the Material DB).

## 7. Release Recommendation

**Ship it.** The core engineering claim of this version - "reuse the existing TS# matching, add
only the specified post-processing" - is true by inspection of the actual diff (one new line in
`transformer.ts`'s loop, one new small module, one new fallback in an existing alias-resolution
step, in two places) rather than by narrative alone. The column-order and header-name requirements,
which are easy to get subtly wrong (inserting a field in the middle of an existing list rather than
appending it), were verified against the spec's literal numbered table, not just "the fields are
all present."

**What was not verified**: per this project's standing, disclosed limitation, no interactive
click-through in a live browser was performed - no browser automation tool is available in this
environment, and this version's column-width/no-wrap requirement is exactly the kind of claim that
would benefit most from one (Section 3's three-angle approximation is the closest available
substitute, not a replacement). `next build` reproduces the same pre-existing, disclosed
Windows-only `EISDIR` bug documented since V1.03 (unrelated to any V1.14 code) - verified instead
via GitHub Actions' Linux CI runner, as in every prior version.

## Overall Grade: **A**

**Why A**: every "reuse, don't duplicate" claim in this report is backed by pointing at the actual,
minimal diff, not asserted. The one real design decision this version required (where to put the
default-header override - a new mechanism vs. extending the existing alias fallback) chose the
smaller, more consistent option, and applying it correctly required finding and updating the *two*
places header resolution already lived, not just one - both were found and updated, verified by a
dedicated export-path test. A genuine, previously-latent CSS gap (missing `white-space: nowrap`)
was found by direct inspection rather than assumed away, matching this project's established
"grep the actual shipped CSS" methodology from the V1.04.1 review.

**Why not A+**: the column-width/no-wrap requirement - this version's most visually-oriented
requirement - remains the one claim in this report that composite jsdom-based evidence can
approximate but not conclusively prove, the same recurring "no live browser" limitation named in
every prior version's review, made slightly more salient here because this version's whole
Section 13 requirement is fundamentally a rendering claim.

## Future Improvements

- **A Playwright/browser-based CI smoke test** (carried forward from every prior version's review -
  would directly and conclusively verify this version's column-width/header-wrap requirement in an
  actual browser, closing the one gap Section 3 above can only approximate).
- **A one-time migration nudge for pre-V1.14 custom rules** (Section 6) - e.g. a Release Notes
  callout pointing users at the Rule Editor, rather than silent non-inclusion - not required by
  this version's spec, but worth considering if user feedback suggests the missing-by-default
  behavior for existing custom rules causes confusion.
