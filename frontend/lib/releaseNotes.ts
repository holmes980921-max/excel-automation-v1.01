/**
 * Release Notes content (V1.09 "primary in-app location for communicating
 * updates"). Plain data, kept separate from the dialog that renders it so
 * a future version only ever needs to add one new entry here.
 *
 * V1.01-V1.02 and V1.04-V1.04.1 are each combined into one entry (their
 * changes were closely related and this keeps the list a reasonable
 * length) - every version from V1.03 onward gets its own entry.
 */

export type ReleaseNote = {
  version: string;
  date: string;
  title: string;
  new: string[];
  improved: string[];
  fixed: string[];
  knownIssues: string[];
};

export const RELEASE_NOTES: ReleaseNote[] = [
  {
    version: "V1.09",
    date: "2026-08-07",
    title: "Support & Usability",
    new: [
      "Remove/Clear actions for an accidental upload or paste, before converting",
      "Error Log Viewer (Show Log) with Copy Log and a developer contact, for unexpected errors",
      "This Release Notes page",
    ],
    improved: ["Renamed to RCC Excel Automation"],
    fixed: [
      "Home no longer leaves the previous Transformation Rule or status message behind - it now returns the app to its literal initial state",
    ],
    knownIssues: [
      "Abort still only cancels the browser's request, not the backend's already-started computation (client-side only)",
      "The Transformation Rule shaping logic is intentionally duplicated between frontend and backend (see CODE_REVIEW_V1.08.md) - not a bug, a reviewed trade-off",
    ],
  },
  {
    version: "V1.08",
    date: "2026-08-07",
    title: "Production Readiness & Stability",
    new: [],
    improved: [
      "ESLint configured and enforced for the first time",
      "Backend test coverage 88% -> 94%",
      "DESC-column-placement and API route exception-handling logic deduplicated",
    ],
    fixed: [
      "Pasting ~200,000+ rows no longer freezes the browser (the raw text no longer reaches the DOM)",
      "A missing psutil dependency that would have broken a genuinely clean install",
    ],
    knownIssues: ["3 npm audit findings require a Next.js major-version upgrade, deliberately deferred"],
  },
  {
    version: "V1.07",
    date: "2026-08-07",
    title: "User Experience & Workflow",
    new: [
      "Home screen - no Upload click needed, drag & drop or paste directly",
      "Abort for an in-flight conversion",
      "Workflow status badges (Converted / Description Applied / Ready to Save)",
    ],
    improved: [
      "DESC now displays and exports immediately after PPID instead of at the end",
      "The Preview grid's column order is guaranteed to match the exported file exactly",
    ],
    fixed: [],
    knownIssues: ["Abort is client-side only (see V1.08/V1.09 notes)"],
  },
  {
    version: "V1.06",
    date: "2026-08-07",
    title: "Productivity & User Experience",
    new: [
      "Add Description - automatic PPID-based DESC merge from a lookup file",
      "Preview Rows control (100/500/1000/5000/All)",
      "Quick Save and Save As, replacing Download",
    ],
    improved: ["Search always matches the full dataset regardless of the Preview Rows setting"],
    fixed: [],
    knownIssues: ["Save As's native folder picker only works in Chromium-based browsers"],
  },
  {
    version: "V1.05",
    date: "2026-08-07",
    title: "Performance, Reliability & Observability",
    new: ["Debug Mode (per-stage timing, peak memory, engine used)", "Processing overlay with stage/progress indicator"],
    improved: [
      "~8.6x faster conversion at 300,000-row scale (calamine reader)",
      "Simplified default UI - Transformation Rule Editor moved behind Settings -> Advanced",
    ],
    fixed: [],
    knownIssues: ["Peak memory increased ~19% as a disclosed trade-off for the speed gain"],
  },
  {
    version: "V1.04 - V1.04.1",
    date: "2026-08-06",
    title: "Production Readiness",
    new: [".xls support with automatic format detection", "One-click run/update scripts"],
    improved: ["Calmer status-bar notifications", "Polished upload drag states"],
    fixed: [
      "\".xls\" files that are actually HTML tables (a common ERP/MES export pattern) were rejected outright",
      "Zebra striping/row hover/selected highlighting weren't rendering in the preview grid",
    ],
    knownIssues: [],
  },
  {
    version: "V1.03",
    date: "2026-08-06",
    title: "Transformation Rule Editor",
    new: [
      "Configurable output columns, ordering, and display aliases",
      "Rule save/update/delete/import/export, with live client-side preview",
    ],
    improved: [],
    fixed: [],
    knownIssues: [],
  },
  {
    version: "V1.01 - V1.02",
    date: "2026-08-05",
    title: "Initial Release",
    new: [
      "Upload or paste a PPID/Parameter/Reference Value excel export, convert, preview, and download",
      "TS# output format, flexible input columns, client-side search and sort",
    ],
    improved: [],
    fixed: [],
    knownIssues: [],
  },
];
