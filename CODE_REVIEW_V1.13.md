# RCC Excel Automation V1.13 - Code Review Report (Clipboard-Only Input UX & Documentation Update)

Scope: the `browser-edition` branch as of this delivery, reviewed by the same agent that
implemented it (conflict of interest noted, as in every prior report). This version's mandate was a
UX standardization, not a feature: make Clipboard Paste the only Conversion Input method on the
Home screen, make the workflow more discoverable (initial-screen guidance, placeholder text, an
Add Description example format, a Film Material hover affordance), and bring the Help & Support
docs in line - all without touching Excel conversion, Add Description's own input methods, Error
Details, Film Material Visualization's behavior, or the Material DB. This review judges the release
against that mandate, with particular weight on regression safety, since a UX-only version has no
excuse for touching business logic.

## 1. Architecture

**The removal was purely subtractive from `HomeScreen.tsx`**, not a rewrite of the conversion path:
`react-dropzone`, `ACCEPTED_FILE_TYPES`, `describeRejection`, the `file` state, `onDrop`,
`handleRemoveFile`, the `convertFile` import, and the entire Upload panel JSX were deleted; the
paste-handling code path (`pastedText`/`pasteSummary` state, `handleConvert`'s call into
`convertText`, Abort, Error Details) was left untouched. `lib/api.ts`'s `convertFile` export is now
unreferenced by any UI component as a direct consequence, but was left in place rather than deleted
- removing a public API function is a larger, unrequested change than this version's UX-only mandate
calls for, and the underlying engine/worker path it wraps is unrelated to what changed.

**`ExcelGrid.tsx` gained one small shared helper, not new architecture.** The V1.13 hover
requirement ("clickable filmmaterial cells should look subtly different on hover") needed the same
predicate the click handler already used, so both now share `isClickableFilmMaterialValue()` instead
of duplicating the truthy-string check inline in two places - incidentally fixing a pre-existing
V1.12 bug in the process (Section 4).

**Hover styling lives in `globals.css`, not component state**, because AG Grid cells are plain
rendered text, not custom React cell renderers - `cellClass` assigns a `film-material-cell` class,
and a real CSS `:hover` rule (with a `transition`) does the rest. This keeps the hover affordance
declarative and free of any JS-driven mouseenter/mouseleave state that would only exist to
replicate what CSS already does natively.

## 2. User Experience

- **One input method, stated three times, consistently.** The exact same 4-step workflow (with the
  exact product names `"All Export to Excel"` and `"EXPORT_ALL_TABLE_%%.xls"`) appears on the
  initial screen as visible guidance, inside the paste area as a placeholder, and in
  `USER_GUIDE.md`'s Basic Workflow section - a user can't land on a page that contradicts another.
- **The placeholder is genuinely light, not a fake input.** It uses the `TextField`'s native
  `placeholder` prop (styled via `text.disabled`), so it disappears the instant real content is
  typed or pasted, with no extra state to keep in sync and no risk of it lingering behind pasted
  text.
- **Add Description's guide is additive, not a new control.** "We provide the example format." plus
  a `PPID | DESC` sample table sits above the dialog's existing Upload/Drag & Drop/Paste controls -
  it explains what good input looks like without adding a fourth way to provide it, matching the
  spec's explicit instruction not to add new input controls there.
- **The Film Material hover affordance is subtle by design, not a new button.** Underline +
  `#1565c0` color shift with a `0.15s` transition, applied only to already-clickable cells; the
  non-hovered state is unchanged plain table text, and it's still a click on the cell itself - no
  separate "View" control was introduced, matching the spec's explicit constraint.

## 3. Documentation Changes

`USER_GUIDE.md`, `FAQ.md`, and `TROUBLESHOOTING.md` were each edited to describe Clipboard Paste as
the only Conversion Input method, with explicit "don't try to upload" guidance and Ctrl+A/Ctrl+C/
paste recovery steps for a bad paste. Care was taken to *not* touch the parts of these documents
that describe Add Description, since that feature's three input methods didn't change - `USER_GUIDE.
md`'s Add Description section still correctly lists Upload/Drag & Drop/Paste, and `FAQ.md`'s "How
do I use Add Description?" entry is untouched. This distinction (Conversion Input vs. Add
Description input) is the one place this version's scope could easily have been over-applied, and
it wasn't.

## 4. A Pre-Existing Bug Found and Fixed As a Byproduct

Implementing the hover affordance required a shared "is this filmmaterial value actually
clickable?" predicate. The pre-existing V1.12 logic was `typeof value === "string" &&
value.trim()`, which is truthy for the missing-value placeholder `"-"` (`"-".trim()` is `"-"`, a
non-empty string) - meaning a missing filmmaterial value has always shown a pointer cursor and,
after this change, would have gotten the hover underline too, both misleadingly implying it's
clickable when clicking it does nothing (the click handler's own check already excluded it
correctly, so no click-time misbehavior existed, only the cursor/affordance). Fixed by adding an
explicit `MISSING_VALUE_PLACEHOLDER` exclusion to the new shared `isClickableFilmMaterialValue()`
helper, now used consistently by the cursor style, the hover class, and the click handler. This is
a one-line, narrowly-scoped fix disclosed here rather than silently bundled in - it does not touch
Longest Match First parsing, the Material DB, or the visualization modal, all of which this
version's spec explicitly protects.

## 5. Testing Notes

**A test caught the bug in Section 4 directly**: a new test asserting the hover-affordance class is
*not* applied to an empty/missing filmmaterial value failed against the old logic before the fix,
then passed after - i.e., the regression test exists because the bug was found, not fixed and then
tested for appearance's sake.

**Global test timeout raised, not per-test whack-a-moled.** A `--coverage` full-suite run showed
timeouts moving between different, unrelated tests on repeated runs (at one point a completely
untouched V1.10 file, `lib/converter/regression.test.ts`) - clear evidence of system-wide resource
contention from coverage instrumentation on this machine, not a slow individual test. Rather than
adding an ad hoc extended timeout to whichever test happened to time out on a given run (matching
the narrower fix already present for two `page.test.tsx` tests since V1.09/V1.11), `vitest.config.
mts` now sets `testTimeout: 20000` globally, and the three existing per-test overrides were raised
to match rather than left inconsistent with the new default. Confirmed clean (237/237) on the
following full-suite `--coverage` run.

## 6. Regression Safety

**Verified, not assumed:**
- Full suite: **237 tests, all passing** (up from V1.12's 225), confirmed both with and without
  `--coverage`, and confirmed clean on a second full-suite `--coverage` run after the timeout fix
  in Section 5 (i.e. not a one-off pass).
- No existing test covering Excel conversion, Add Description's own three input methods, Error
  Details/Copy Log privacy gating, Film Material parsing/visualization, or the Material DB was
  removed or weakened. The tests that changed are exactly the ones that directly asserted the
  now-removed Home-screen Upload/Drag & Drop UI (replaced with equivalent "is not present"
  assertions) or referenced the old placeholder text (updated to match the new copy).
- `tsc --noEmit` and `eslint .` both clean.
- `frontend/lib/converter/` (the conversion/rule/merge engine), `materialDb.ts`,
  `filmMaterialParser.ts`, and `cssColor.ts` were not touched this version at all.
- Add Description's Upload/Drag & Drop/Paste controls were read back after editing
  `AddDescriptionDialog.tsx` to confirm only the new example-format guide was added above them -
  no existing JSX in that dialog was removed or restructured.
- A local `next dev` boot check confirmed the app starts and serves the Home screen without an
  import/runtime error (see Release Recommendation for the one environment hiccup encountered and
  resolved along the way).

**Not independently re-verified this version** (unchanged since V1.12, no code path touched):
Material DB validation/contrast logic, Longest Match First tokenization edge cases - covered by
their own untouched V1.12 test files, which are part of the 237 passing.

## 7. Test Coverage

**237 frontend tests** (V1.12: 225 → V1.13: 237, **net +12**). Breakdown of what changed:
- `HomeScreen.test.tsx`: the old "Remove selected file (V1.09)" describe block and all
  `convertFile`/dropzone-based tests were removed (they tested UI that no longer exists) and
  replaced with two new describe blocks - "Conversion Input - Clipboard Paste only (V1.13)" (no
  file input, no Drag & Drop/Upload/Browse text anywhere on the page, placeholder contains both
  exact product names and Ctrl+A guidance, placeholder disappears on paste, paste still drives
  Convert) and "Initial screen guidance (V1.13)" (the 4-step guide renders with the exact product
  names and no upload language). Net: 17 tests in this file.
- `AddDescriptionDialog.test.tsx`: +2 (`shows the example PPID/DESC format guide`, and an explicit
  regression check that Upload/Drag & Drop are still present alongside Paste).
- `ExcelGrid.test.tsx`: +3 (hover-affordance class applied to a clickable cell, withheld from an
  empty/missing cell - the test that caught Section 4's bug - and withheld from a non-filmmaterial
  column).
- `app/globals.css.test.ts` (new file): +3 - reads the compiled `globals.css` source directly and
  asserts the `.film-material-cell` hover rule contains `text-decoration: underline` and a color,
  and that unrelated rules (`.row-number-cell`) are unaffected. This exists because jsdom cannot
  compute a live `:hover` pseudo-class state, so hover *content* can only be verified by reading the
  stylesheet's actual source text, not by simulating a real hover and reading computed style.
- `app/page.test.tsx`: 3 stale `/paste excel data/i` placeholder-text queries updated to
  `/paste rcc data here/i` (a mechanical follow-on of the placeholder copy change, not new
  coverage).

## 8. Technical Debt

**Introduced this version, disclosed:**
- `lib/api.ts`'s `convertFile` export is now dead code from the UI's perspective (no component
  calls it) but was intentionally left in place rather than removed, since deleting a public API
  function is a larger change than a UX-only version's mandate justifies. Worth revisiting in a
  future version if it's confirmed to have no remaining callers or purpose.
- The global `testTimeout: 20000` (Section 5) is a blunter instrument than diagnosing the actual
  source of coverage-instrumentation overhead on this machine - it makes tests more tolerant of
  slowness rather than making them faster. Acceptable given every prior version hit the same class
  of flakiness and worked around it the same way; a real fix would mean investigating whether
  coverage collection itself can be made cheaper (e.g. a different provider/config), which is out
  of scope for a UX version.

**Explicitly not introduced, by design (per spec's Scope Restrictions):**
- No server migration, auth, permissions, new DB architecture, new conversion rules, or changes to
  Film Material parsing/visualization behavior or business-data processing.

**Carried forward from V1.12, out of scope for this version:**
- Everything already listed in `CODE_REVIEW_V1.12.md`'s Technical Debt (unchanged - this version
  didn't touch Film Material parsing, the Material DB, or the conversion engine).

## 9. Release Recommendation

**Ship it.** The one-directional nature of this version's risk (it can only ever *remove* UI
surface and *add* documentation/styling, never touch business logic) is backed up by the actual
diff, not just the spec's framing: `lib/converter/`, `materialDb.ts`, `filmMaterialParser.ts`, and
`cssColor.ts` are byte-for-byte untouched, and the only non-doc, non-test code changes are
`HomeScreen.tsx` (subtractive), `AddDescriptionDialog.tsx` (additive, above existing controls),
`ExcelGrid.tsx`/`globals.css` (a shared predicate + a CSS hover rule), and `vitest.config.mts` (a
test-infrastructure timeout, not app code).

**What was not verified**: per this project's standing, disclosed limitation, no interactive
click-through in a live browser was performed - no browser automation tool is available in this
environment. Coverage instead comes from component tests (RTL/jsdom) and a local dev-server boot
check; a first attempt at the boot check hit this same machine's known `.next/trace` `EPERM`
file-lock issue from a lingering `node.exe` process (documented in this project's environment
notes, unrelated to any V1.13 code change) and succeeded on retry after clearing it.

## Overall Grade: **A**

**Why A**: every regression-safety claim in Section 6 is backed by a specific, re-run test result,
not an assumption from "the diff looks isolated." The one real judgment call this version required
(interpreting the spec's "don't add a file picker or Drag & Drop to Add Description" as protecting
its *existing* three input methods, not mandating their removal) is the correct reading given the
spec's own explicit regression-safety list, and was verified against the actual dialog code, not
just inferred from wording. The pre-existing V1.12 bug found in Section 4 was fixed narrowly and
disclosed, not silently bundled or left for a future version to rediscover.

**Why not A+**: `lib/api.ts`'s now-dead `convertFile` export was left rather than removed
(Section 8) - a defensible, disclosed choice for a UX-scoped version, but still debt. Live-browser
verification remains categorically unavailable in this environment, the same recurring limitation
named in every prior version's review.

## Future Improvements

- **Remove or repurpose `lib/api.ts`'s `convertFile`** once it's confirmed to have no remaining
  callers, closing the dead-code gap named in Section 8.
- **A Playwright/browser-based CI smoke test** (carried forward from every prior version's review -
  still the single highest-value addition for closing this project's recurring "no live browser"
  verification gap, and would directly cover this version's placeholder-disappears-on-paste and
  hover-affordance behavior in an actual browser rather than jsdom).
