# Troubleshooting Guide

## General approach

For any problem, this is the recommended order:

1. **Read the on-screen message.** Most errors are self-explanatory (e.g. "isn't a supported file type").
2. **Open Error Details** (from the error message, or from Help & Support) to see the full technical detail.
3. **Click Copy Log.**
4. **Send the copied log to the developer**, along with a short description of what you were doing when the problem happened.
5. If needed, an administrator or the developer may ask you to check the browser console (**Advanced Troubleshooting**, below) - this is not something you need to do first.

> Developer: **jong10k.kim**

## Common issues

### Paste does not contain the expected data

1. Open **"EXPORT_ALL_TABLE_%%.xls"** (saved via RCC's **"All Export to Excel"**).
2. Press **Ctrl+A**.
3. Press **Ctrl+C**.
4. Return to the application.
5. Paste again into the Conversion Input area.

Re-copying the full sheet, rather than a partial selection, resolves the most common paste issues.

### I tried to upload a file / drag and drop a file

File Upload and Drag & Drop are intentionally not supported in V1.13. Clipboard Paste is the only
supported Conversion Input method - see [Paste does not contain the expected data](#paste-does-not-contain-the-expected-data)
above for the copy/paste steps.

### Conversion fails after paste

1. Confirm the data came from the RCC export (not a manually edited or partial copy).
2. Confirm the entire sheet was copied, not just a portion of it.
3. Retry using Ctrl+A → Ctrl+C → Paste.
4. If the problem persists, use **Error Details** / **Copy Log** (see [General approach](#general-approach) above) and send the log to the developer - the log never includes your data (PPID, TS#, DESC, Parameter, or Reference Value), only technical diagnostic information.

### Conversion failed / the grid stays empty

The most common cause is that the input doesn't contain any recognizable `TS#<n>_<field>` data under a `PPID` row - the app intentionally reports an error rather than silently producing an empty result. Double-check that you copied the full range, including the header row, from **"EXPORT_ALL_TABLE_%%.xls"**.

### Add Description fails

Check that your Description data has a `PPID` column and a `DESC` (or `Description`) column - these are matched by header name, not position. If the error mentions "missing required column(s)," one of the two wasn't found under any recognized name.

### "Description file has duplicate PPID(s)"

Your Description data lists the same PPID more than once. The error message lists which PPIDs repeat. Remove or consolidate the duplicate rows in your source data before trying again - the app won't guess which value to keep.

### Save As doesn't open a folder picker

The native Save dialog only works in Chrome/Edge-family browsers (the File System Access API isn't implemented elsewhere). In Firefox/Safari, Save As automatically falls back to the same behavior as Quick Save - this is a browser limitation, not a bug.

### Browser-related issues

RCC Excel Automation is built and tested primarily against current versions of Chrome/Edge. If something behaves unexpectedly in another browser, trying the same action in Chrome or Edge first will help narrow down whether it's browser-specific.

### Large Preview / "All" feels slow

Setting Preview Rows to **All** on a large dataset asks the browser to render every row at once, which is inherently slower the larger the file - this is expected, not an error. Switching back to a smaller Preview Rows setting (e.g. 500 or 1000) keeps the grid responsive; your underlying data and export are unaffected either way.

### Unexpected application errors

If the entire page shows a "Something went wrong" recovery screen, click **Show Log**, then **Copy Log**, and send it to the developer. Clicking **Return to Home** starts a fresh session - your browser and the application itself are otherwise fine.

## Advanced Troubleshooting

The steps below are for when the developer specifically asks for more detail, or if you're comfortable with browser developer tools. They are not required for normal use.

1. Press **F12** (or right-click → Inspect) to open Developer Tools.
2. Click the **Console** tab.
3. Look for red error text, and copy it if asked.

This is a fallback for cases Error Details doesn't fully explain - for most problems, Copy Log from Error Details is enough.
