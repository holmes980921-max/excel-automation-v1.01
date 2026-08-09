# User Guide

A step-by-step walkthrough of RCC Excel Automation, from your first conversion to exporting a finished file. No developer knowledge required.

## Getting Started

RCC Excel Automation runs entirely in your browser. There is nothing to install, nothing to log into, and nothing you paste or upload is ever sent to a server - everything happens on your own computer.

When you open the app you land directly on the **Home** screen, with two ways to bring in data: **Upload** (drag & drop or browse for a file) and **Paste** (Ctrl+V).

## Input Data

**The normal way to use this app is with data copied directly from RCC:**

> RCC → Download data → Copy the RCC-downloaded data → RCC Excel Automation → Clipboard Paste → Convert

1. Download your data from RCC as usual.
2. Open the downloaded file and copy the range you need (including the header row).
3. Come back to RCC Excel Automation and click into the **Paste** panel on the Home screen.
4. Press **Ctrl+V**. Copying is a click-through Excel workflow - nothing needs to be reformatted first.

### If Clipboard Paste doesn't work

Some browsers or security settings block a direct paste. If pasting doesn't seem to pick up your data:

1. Open the file you downloaded from RCC in Excel.
2. Press **Ctrl+A** to select the entire dataset.
3. Press **Ctrl+C** to copy it.
4. Return to RCC Excel Automation.
5. Click into the **Paste** panel and press **Ctrl+V** again.

This full-select-and-copy approach resolves the most common paste issues.

**File Upload** works the same way if you'd rather save the RCC download as a file first: drag it onto the Upload panel, or click the panel to browse for it. `.xls`, `.xlsx`, and `.xlsm` are all supported.

### What columns does the app expect?

The converter looks for three columns in your data: **PPID**, **Parameter**, and a reference/value column (matched by a header containing "ref" or "value", e.g. `Reference Value`). It finds these by column *name*, so extra columns in your export (operator name, timestamps, comments, etc.) are simply ignored rather than causing an error. If your file's headers don't match these names, the app falls back to reading the first three columns positionally.

Example (fictional data, for illustration only):

| PPID | Parameter | Reference Value |
|---|---|---|
| AB000010_1 | PPID | AB000010_1 |
| AB000010_1 | TS#1_CardName | CARD1 |
| AB000010_1 | TS#1_FilmMaterial | FILM-A |
| AB000020_1 | PPID | AB000020_1 |
| AB000020_1 | TS#1_CardName | CARD2 |

You do not need to build a special template - if your RCC export already has this shape, it will convert correctly.

## Convert

Once you've selected a file or pasted data, the **Convert** button becomes active. Click it and the app processes your data locally (in a background thread, so the page stays responsive even for a large file). A processing overlay shows while this happens, with an **Abort** option if you need to cancel.

## Preview

After converting, you land on the Preview screen: a spreadsheet-style grid showing every converted row, one row per `TS#` block.

- **Preview Rows** (top toolbar) controls how many rows are *rendered*: 100 (default), 500, 1000, 5000, or All. This is purely a display setting - your full dataset is always used for search, sort, and export regardless of this setting.
- Selecting **All** on a very large dataset can be slower, since the browser has to render every row - a confirmation appears first so this is never accidental.

## Search

Type into the Search box in the toolbar. Search always runs against your **entire converted dataset**, not just the rows currently visible under Preview Rows - so if Preview Rows is set to 100 but your search matches 340 rows, the match count will correctly say 340, even though only the first 100 of those matches are shown at once.

## Sort

Click any column header in the grid to sort by that column. Click again to reverse the sort, and a third time to clear it. Sorting understands both text and numbers (e.g. `TS#2` sorts before `TS#10`, not after it alphabetically).

## Transformation Rules

By default the app shows every output column in a fixed order. If you need a different shape - fewer columns, a different order, or different column headers - open **Settings → Show Advanced Features**, then click **Transformation Rules** in the toolbar.

- **Output columns**: check or uncheck which columns appear.
- **Column order**: drag the handle (⋮⋮) next to each column to reorder it.
- **Display aliases**: type into a column's alias field to change its header text in the preview and exported file (the underlying data field itself never changes).
- **Save / Update / Delete**: save your current settings as a named rule, update an existing one, or remove it. Rules are stored in your browser only.
- **Import / Export**: share a rule with a teammate as a `.json` file.

The preview grid updates instantly as you edit a rule - there's no separate "apply" step.

## Add Description

If you have a separate file mapping PPID to a description, you can merge it in after converting. Click **Add Description** in the toolbar.

```
Converted Data + Description Data → PPID-based Merge → DESC
```

All three input methods work identically:

- **File Upload** - click the Add Description panel to browse for a file.
- **Drag & Drop** - drag a file directly onto the panel.
- **Clipboard Paste** - copy a PPID/DESC range from Excel and paste it directly into the panel, the same way you paste on the Home screen.

Your Description data needs a `PPID` column and a `DESC` (or `Description`) column, matched by name. Every converted row whose PPID matches gets that DESC value; rows sharing the same PPID all receive the same DESC. Rows with no match are left as `-`.

**Duplicate PPIDs** in your Description data are rejected with an error listing which PPIDs repeat - there's no reliable way to guess which one you meant, so please fix the source data and try again.

After merging, the Status Bar shows how many PPIDs matched and how many didn't, and the grid shows a new **DESC** column positioned immediately after **PPID** - this position is fixed and doesn't change based on your Transformation Rule.

## Export

Two ways to save your result, both in the toolbar:

- **Quick Save** - downloads immediately to your browser's default download location, with an auto-generated filename: `RCC_converted_YYMMDD_HHMMSS.xlsx`.
- **Save As** - opens your OS's native save dialog so you can choose the folder and filename yourself (Chrome/Edge only - other browsers fall back to the same behavior as Quick Save, since they don't support this browser feature).

The column order in your downloaded file always exactly matches what you see in the Preview grid, including your active Transformation Rule and, if used, the DESC column immediately after PPID.

## Home

Click **Home** (top-left, always visible) to start over with a new file. If you have an active result, you'll be asked to confirm first - nothing is discarded silently. Home fully resets the app: the file/pasted data, preview, search, Add Description result, and the active Transformation Rule all return to their starting state.

## Abort

While a conversion is running, click **Abort** on the processing overlay to cancel it. RCC Excel Automation runs conversions in a background thread, so Abort genuinely stops the in-progress work - it isn't just hiding a result that keeps computing in the background.

## Error Handling

If something goes wrong - an unreadable file, unexpected data, or an unrelated application error - you'll see a plain-language error message. For a genuine problem you need to report, see [Error Details](#error-details-copy-log) in Help & Support or the [Troubleshooting Guide](./TROUBLESHOOTING.md).
