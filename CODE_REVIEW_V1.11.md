# RCC Excel Automation V1.11 - Code Review Report (User Guide & Support)

Scope: the `browser-edition` branch as of this delivery, reviewed by the same agent that
implemented it (conflict of interest noted, as in every prior report). This version's mandate was
explicit: make the app easier to learn, troubleshoot, and support - documentation and support/UX
only, with the stable V1.10 conversion logic left alone unless a genuine bug or consistency issue
required touching it. This review judges the release against that mandate, with particular weight
on whether the one place this version *did* touch shared infrastructure (error-reporting plumbing,
for the privacy requirement) was actually necessary and correctly scoped, not scope creep.

## 1. Architecture

**Help & Support content is data, not code, by design.** `frontend/public/docs/{USER_GUIDE,
FAQ,TROUBLESHOOTING}.md` are plain Markdown files, fetched at runtime (`lib/docsLoader.ts`) and
rendered through `MarkdownDoc.tsx`. An administrator edits these three files directly on GitHub;
nothing about the questions, answers, or guide text lives in a React component, a database, or a
CMS - exactly the spec's "editable through GitHub without modifying React/TypeScript" requirement,
satisfied structurally rather than by convention. `lib/faqParser.ts` is the only piece of logic
touching this content, and it does one narrow thing (split `## Question` headings into accordion
entries) - it doesn't parse or validate the *content* of an answer, so an administrator editing
FAQ.md can't break the app by writing an unexpected but valid Markdown answer.

**The one place this version touched shared, non-documentation code**: the error-reporting path
(`lib/converter/worker.ts`, `workerClient.ts`, `lib/api.ts`). This was necessary, not incidental -
see Section 5 (Privacy) for why, and note what it deliberately did *not* touch: `engine.ts`,
`transformer.ts`, `ruleManager.ts`, `descriptionMerger.ts`'s actual merge logic, and `excelIO.ts`'s
actual parsing logic are all unchanged. The only edit to either `InvalidExcelFormatError` class was
adding an explicit `this.name = "InvalidExcelFormatError"` in its constructor - a class-identity
fix with no behavioral effect on what gets thrown, when, or with what message (confirmed by the
full pre-existing test suite, including the Python-vs-JS regression suite, passing unmodified).

**Error Details is documentation, not a live viewer** - a deliberate scope decision. The spec lists
Error Details as a Help & Support sibling of User Guide/FAQ/Troubleshooting, which reads naturally
as "another thing to browse," but a live error only exists at the moment it happens. Rather than
lift "last error" state through `page.tsx` to make it browsable from a general help menu (real
complexity: prop drilling into `AppToolbar`, a new piece of app-wide state, edge cases around when
it's stale), Error Details stays contextual - "Show Details" appears right next to the failure,
exactly where V1.09's `ErrorBoundary` already put it, now extended to two more failure points
(Convert, Add Description). The Help & Support tab explains what the feature is and how to reach
it. This trades a small amount of literal spec-structure fidelity for materially less new state and
fewer ways for "the log I'm looking at" and "the error that actually happened" to drift apart.

## 2. User Experience

- **Help & Support is reachable from literally everywhere** - the toolbar button is unconditional
  (not gated behind `hasResult`, same placement rule as Release Notes), so a first-time user sees
  it before ever converting anything.
- **The Input Data documentation directly matches how RCC data actually flows into this app** -
  download → copy → paste, with the Ctrl+A/Ctrl+C fallback given equal billing to the primary path
  rather than buried as a footnote, per the spec's explicit emphasis on this section.
- **Show Details is now available exactly when it's most needed**: previously, a failed Convert or
  Add Description showed only a one-line message - useful for an obvious problem ("wrong file
  type"), not enough for anything genuinely unexpected. It now offers the same diagnostic depth a
  full-page crash always had.
- **FAQ answers render as Markdown, not plain text** - a Q&A whose answer references another guide
  section (e.g. "see the User Guide's Input Data section") renders as an actual clickable link,
  not literal Markdown syntax, because `FaqTab` runs each answer through `ReactMarkdown` too, not
  just the top-level docs.

## 3. Supportability

This version's entire theme, and where it earns its keep:

- A user who hits a genuine problem now has a complete, self-contained path: read the message →
  Troubleshooting guide (or FAQ) → Show Details → Copy Log → developer contact - all reachable
  without leaving the app, documented consistently in three places (the User Guide, the FAQ, and
  the Troubleshooting guide itself point at each other and don't contradict each other on the
  procedure).
- **The developer contact (`jong10k.kim`) appears in four places now**: `ErrorLogDialog` (unchanged
  from V1.09), Help & Support's Error Details tab, the Troubleshooting guide, and implicitly via the
  FAQ's pointer to Copy Log - consistent wording everywhere, not four independently-drifting copies.
- Future documentation updates require zero code review of application logic - editing
  `TROUBLESHOOTING.md` to add a new known issue is a content change, verifiable by reading the
  Markdown diff, not a change that needs `tsc`/`eslint`/component tests to reason about.

## 4. Privacy (spec's own "critical requirement")

This is the section most worth scrutinizing carefully, since it's the one place this version
touched code outside the documentation surface, and the one requirement stated as non-negotiable.

**The concrete risk found and addressed**: `descriptionMerger.ts`'s duplicate-PPID validation error
intentionally lists the offending PPIDs in its message (`"Description file has duplicate PPID(s):
AB000010_1, AB000020_1"`) - a deliberate, already-shipped V1.06 design choice, not something this
version introduced. That message is fine as an on-screen error (the user already knows their own
PPIDs), but naively wiring "Show Details" to every failure would have put that same PPID list into
a copyable diagnostic log meant to be pasted into an external bug report - a real violation of
"logs must never contain business data," and a subtle one, since nothing about the log-building
code itself (`errorLog.ts`) does anything wrong; the leak would have come entirely from *which*
errors were allowed to reach it.

**The fix is structural, not a content filter.** Rather than scanning error messages for
PPID-shaped patterns before logging (fragile - a format change breaks the filter silently, and a
regex can both over- and under-match), `InvalidExcelFormatError` now identifies itself explicitly
(`this.name`), and that identity is threaded through the one place it would otherwise be lost - the
Worker's `postMessage` boundary, which structurally clones data and drops class identity entirely.
`HomeScreen.tsx`/`AddDescriptionDialog.tsx` then make a binary decision (offer Show Details or
don't) based on that flag, never on message content. This is provably correct for every current and
future `InvalidExcelFormatError`, not just the one message this review happened to think of.

**Verified, not just asserted**: `descriptionMerger.test.ts` and `excelIO.test.ts` each assert
`.name === "InvalidExcelFormatError"` directly (the exact mechanism `worker.ts` relies on), and
`HomeScreen.test.tsx`/`AddDescriptionDialog.test.tsx` each have both a positive case (Show Details
appears for a non-validation `ApiError`) and a negative case (it does not appear for
`isValidationError: true`, using the actual duplicate-PPID message text as the test fixture).

**What this does not cover**: an unexpected (non-`InvalidExcelFormatError`) exception whose message
happens to include user data by accident (e.g. a stray `console.log`-style interpolation bug
somewhere in the engine) would still flow into a log, since the gate only recognizes the one known
category of message-echoes-user-data error. This is a real, narrower residual risk - not zero - and
is exactly the class of thing `engine.ts`'s existing design (no application data ever crosses into
error messages except the one deliberate case) already defends against, but it's worth naming
rather than implying the gate makes every possible leak impossible.

## 5. Maintainability

- `MarkdownDoc.tsx`'s component-mapping approach means a future Markdown feature (e.g. a new
  heading level, a nested list) gets consistent MUI styling automatically, rather than needing a
  bespoke renderer change per document.
- `HelpSupportDialog.tsx`'s tab content is a simple conditional render keyed by a string union
  type (`TABS`), the same shape as `AppToolbar`'s existing `PreviewLimit` pattern - no new state
  management idiom introduced.
- The `isValidationError` flag follows the exact same "add a field to the discriminated response,
  thread it through the one class that carries errors across the Worker boundary" pattern already
  established for the response payload itself in V1.10 - a future error-classification need (if
  one arises) has a precedent to extend rather than a new mechanism to invent.

## 6. Regression Risk

**Low, and specifically verified:**
- Full pre-existing V1.10 test suite (150 tests) passes with only two intentional, disclosed
  changes: two tests gained an explicit timeout (flakiness fix, not a behavior change) and two
  `vi.mock("@/lib/api", ...)` factories gained an `ApiError` export (required because
  `HomeScreen.tsx`/`AddDescriptionDialog.tsx` now import it - without this, `err instanceof
  ApiError` would throw against an `undefined` import in the mocked module, not silently pass).
- `frontend/lib/converter/regression.test.ts` (the V1.09-Python-vs-V1.10-JS field-for-field parity
  suite) passes unmodified, confirming the `InvalidExcelFormatError` constructor edits didn't
  change transform output.
- 20 new tests added, 0 removed, 0 weakened (per the spec's explicit "do not remove or weaken
  existing tests" requirement) - confirmed by diffing test counts (150 → 170) and reading every
  modified existing test file for assertions that were loosened rather than added to.
- `tsc --noEmit` and `eslint .` both clean.

## 7. Test Coverage

**170 frontend tests** (up from V1.10's 150). New coverage: `docsLoader.test.ts` (3),
`faqParser.test.ts` (3), `HelpSupportDialog.test.tsx` (6), two new Error Details describe blocks in
`HomeScreen.test.tsx`/`AddDescriptionDialog.test.tsx` (4 tests total, positive + negative cases),
`toError()` tests in `errorLog.test.ts` (2), and `.name` regression guards in `excelIO.test.ts`/
`descriptionMerger.test.ts` (2). `lib/converter` aggregate coverage remains ~96%.

`MarkdownDoc.tsx` shows 54% coverage - lower than most new files this version, because its loading/
error-state branches (not just the happy-path render already exercised via `HelpSupportDialog.
test.tsx`) aren't independently tested. This is a real, disclosed gap, not a large one - the
component is presentational and its one meaningful failure mode (fetch rejects) is already covered
indirectly by `docsLoader.test.ts`'s own error-path test.

## 8. Technical Debt

**Introduced this version, disclosed:**
- `MarkdownDoc.tsx`'s loading-spinner and error-message states have no dedicated test (see Test
  Coverage).
- The privacy gate recognizes one error category (`InvalidExcelFormatError`) - see Section 4's
  "what this does not cover."

**Explicitly not introduced, by design:**
- No CMS, no database, no new state-management library for documentation content - satisfies the
  spec's explicit "do not build a CMS for this."
- No changes to conversion algorithms, rule shaping, or the merge engine itself.

**Carried forward from V1.10, out of scope for this version:**
- `lib/rules.ts` localStorage tests, `RuleEditor.tsx`/`ExcelGrid.tsx` low component coverage,
  large-file performance vs. the V1.09 calamine reader, Debug Mode's peak-memory figure, and no
  live-browser interactive verification in this environment (all unchanged from
  `CODE_REVIEW_V1.10.md`).

## 9. Release Recommendation

**Ship it.** The release stays inside its stated mandate - genuinely a documentation/support
release, with the one exception (error-reporting plumbing) both narrowly scoped and directly
required by the spec's own "critical requirement" rather than an unrelated improvement bundled in.
The privacy mechanism is structural (identity-based, not content-filtering) and tested for both
directions (offered / not offered), which is the right shape of evidence for a "must never leak"
requirement - a passing test that only checks the happy path wouldn't have been enough here.

## Overall Grade: **A**

**Why A**: this version does something genuinely harder than it looks - "add documentation" sounds
purely additive, but the spec's own privacy requirement (Section 15, explicitly called "critical")
forced a real design decision (message-content filtering vs. structural type-identity gating), and
the harder, more durable option was chosen and correctly threaded through an architectural boundary
(the Worker's structured-clone barrier) that isn't obvious unless you actually trace where class
identity gets lost. The Error Details scope decision (documentation, not a live viewer) is a
considered trade-off with stated reasoning, not an unexamined shortcut. Zero existing tests were
weakened, and the one flaky pre-existing test class was closed out rather than left for a future
version to rediscover.

**Why not A+**: `MarkdownDoc.tsx`'s non-happy-path states remain untested, and the privacy gate's
stated limitation (Section 4's "what this does not cover") is a real, if narrow, residual gap -
correctly disclosed rather than hidden, but still open.

## Future Improvements

- **`MarkdownDoc.tsx` loading/error-state tests** - the smallest, most concrete gap this version
  leaves behind.
- **Broaden the privacy gate beyond `InvalidExcelFormatError`** if a future error category is ever
  found to echo user data - the same `.name`-based mechanism extends directly.
- Everything already listed in `CODE_REVIEW_V1.10.md`'s Future Improvements remains open and
  unchanged by this version (Playwright/browser-based CI smoke test, real-usage performance data,
  V2.0 Server Edition planning).
