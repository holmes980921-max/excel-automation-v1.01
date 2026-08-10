# User Guide

## 1. Overview

**RCC Excel Automation** converts a PPID / Parameter / Reference Value data export from RCC into a
flat table - one row per `TS#` block - ready for review and further use. It runs entirely in your
browser: nothing you upload or paste is ever sent to a server, and there is nothing to install.

It's intended for anyone who regularly turns an RCC data export into a clean, reviewable Excel
file, without needing to write a script or perform the reshaping by hand.

## 2. Basic Workflow

The complete workflow, start to finish:

```
Get the data from RCC → Input the data → Convert → Preview → Export the result
```

1. **Get the data from RCC** - download or copy your data from RCC as usual.
2. **Input the data** - upload the file, drag & drop it, or paste it directly into RCC Excel
   Automation.
3. **Convert** - click Convert and the app reshapes the data locally.
4. **Preview** - review the result in the grid before doing anything else with it.
5. **Export the result** - save the finished file with Quick Save or Save As.

## 3. Conversion Input

**Use the file downloaded directly from RCC whenever possible** - there's no need to reformat it
or build a special template first; if it already has the shape RCC exports, it converts correctly.

### Supported input methods

- **File Upload** - click the Upload panel on the Home screen to browse for a file.
- **Drag & Drop** - drag the file directly onto the Upload panel.
- **Clipboard Paste** - copy a range out of Excel (including the header row) and paste it into the
  Paste panel with Ctrl+V.

### If Clipboard Paste doesn't work as expected

1. Open the Excel file you downloaded from RCC.
2. Press **Ctrl+A** to select the entire data.
3. Press **Ctrl+C**.
4. Return to RCC Excel Automation and paste it into the Paste panel.

This full-select-and-copy approach resolves the most common paste issues.

## 4. Transformation Rule

A Transformation Rule controls which columns appear in your output, in what order, and under what
name. The **Default** rule (always available) shows every column in the standard order; you only
need to touch this section if you want something different.

Open **Settings → Show Advanced Features**, then click **Transformation Rules** in the toolbar to:

- **Select output columns** - check or uncheck which columns are included.
- **Change column order** - drag a column's handle (⋮⋮) to reorder it.
- **Set display aliases** - type a different header name for a column (the underlying data field
  itself never changes, only what's displayed/exported).
- **Save / update / delete rules** - keep multiple named rules and switch between them.
- **Import / export rules** - share a rule with a teammate as a `.json` file.

The Preview grid updates instantly as you edit a rule.

## 5. Add Description

Add Description merges a `DESC` column onto your converted data by matching `PPID`, so you don't
have to do a manual VLOOKUP/XLOOKUP afterward.

Click **Add Description** in the toolbar once you have a conversion result, then provide your
Description data (a `PPID` column and a `DESC` or `Description` column) using any of:

- **File Upload**
- **Drag & Drop**
- **Clipboard Paste**

All three produce identical results for the same data.

- **PPID-based matching**: every converted row whose `PPID` matches a row in your Description data
  receives that `DESC` value. Rows sharing the same `PPID` all receive the same `DESC`.
- **Matched / Unmatched results**: after merging, the Status Bar shows how many PPIDs matched and
  how many didn't. Rows with no match keep a `-` in the DESC column.
- **Duplicate PPIDs** in your Description data are rejected with an error listing which PPIDs
  repeat - fix the source data (remove or consolidate the duplicates) and try again.

### How to clear/remove incorrect input

If you selected the wrong file or pasted the wrong data - either on the Home screen or in Add
Description - click **Remove** (next to a selected file) or **Clear** (next to a pasted-data
summary) to discard it and start over, without needing to convert or close the dialog first.

## 6. Preview and Review

After converting, review your result before doing anything else with it:

- **Preview Rows** (toolbar) controls how many rows the grid actually renders: 100 (default), 500,
  1000, 5000, or All. This only affects what's displayed - your full dataset is always used for
  search, sort, and export regardless of this setting. Choosing **All** on a large dataset can be
  slower to render, since the browser has to draw every row.
- **Search** (toolbar) always matches against your entire converted dataset, not just the rows
  currently visible - the match count is always accurate even if Preview Rows is limiting what's
  shown.
- **Sort** - click a column header to sort by it, click again to reverse, and a third time to
  clear the sort. Numbers and `TS#` labels sort naturally (`TS#2` before `TS#10`).
- **Checking the result before export** - confirm the row count, column order, and (if used) the
  DESC column all look right in the Preview grid before saving.

## 7. Export

Two ways to save your result, both in the toolbar:

- **Quick Save** - downloads immediately with an auto-generated filename
  (`RCC_converted_YYMMDD_HHMMSS.xlsx`) to your browser's default download location.
- **Save As** - opens your operating system's native save dialog so you can choose the folder and
  filename yourself. This only works in Chrome/Edge-family browsers; other browsers fall back to
  the same behavior as Quick Save.

**Verify the output before using it for downstream work** - the column order in the downloaded
file always exactly matches what you saw in the Preview grid, including your active Transformation
Rule and, if used, the DESC column immediately after PPID, but it's still worth a quick open-and-
check before relying on it further.

## 8. Error Handling

### What to do when conversion fails

Read the on-screen message first - many are self-explanatory (e.g. an unsupported file type). If
it's not clear what went wrong, use Show Details (below) to get more information, or check the
[Troubleshooting](#9-troubleshooting) section.

### What "Show Details" means

When a conversion or Add Description attempt fails unexpectedly, a **Show Details** action appears
next to the error message. It opens a technical diagnostic view - timestamp, application version,
error message, stack trace, and browser/OS information - meant to help reproduce and fix the
problem. It is **not** a developer Debug Mode, and it never includes your data (no PPID, TS#, DESC,
Parameter, or Reference Value).

### How to use "Copy Log"

Inside the Show Details view, click **Copy Log** to copy the full diagnostic text to your
clipboard. You'll see a short "Log copied to clipboard" confirmation. Paste it into your bug report
or message to the developer, along with a short description of what you were doing.

### Developer contact

If a problem persists after checking the FAQ and Troubleshooting guide, contact the developer:

**Developer: jong10k.kim**

## 9. Troubleshooting

**Incorrect RCC input** - double-check you copied/uploaded the complete range from your RCC
download, including the header row. If the input doesn't contain any recognizable
`TS#<n>_<field>` data under a `PPID` row, conversion reports an error rather than producing an
empty result.

**Clipboard paste failure** - use the Ctrl+A / Ctrl+C fallback described in
[Conversion Input](#3-conversion-input), or use File Upload / Drag & Drop instead.

**Add Description mismatch** - confirm your Description data has a `PPID` column and a `DESC` (or
`Description`) column, matched by name. A "duplicate PPID" error means the same PPID appears more
than once in your Description data - the message lists which ones, so you can fix the source file.

**Conversion failure** - open Show Details for the technical error message, and check the
Troubleshooting notes in Help & Support for the specific error you're seeing.

**Browser refresh/retry** - if the app seems stuck or behaves unexpectedly, refreshing the page
returns it to a clean starting state (nothing is saved server-side to lose). Try the same action
again afterward.

**When to contact the developer** - if a problem persists after trying the above, click **Copy
Log** from Show Details and send it to **jong10k.kim** along with what you were doing when it
happened.

## 10. Important Notes

- Do not manually modify RCC source data before conversion unless necessary - the converter is
  designed to read RCC's export format directly.
- Always verify the Preview before exporting - confirm row count, column order, and (if used) the
  DESC column look correct.
- Do not share sensitive business data unnecessarily.
- Error logs must not contain business data such as PPID, TS#, Description, Parameter, or
  Reference Value - if you ever see any of these in a copied diagnostic log, stop and report it to
  the developer, since that would be a bug in the logging itself, not expected behavior.
