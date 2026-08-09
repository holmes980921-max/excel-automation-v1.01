# Frequently Asked Questions

## What data should I use?

Data downloaded from RCC. Copy it directly from the downloaded file and paste it into RCC Excel Automation - see the [User Guide's Input Data section](./USER_GUIDE.md#input-data) for the exact steps.

## How do I use RCC-exported data?

Download it from RCC, open it, copy the range you need (including the header row), then paste it into the **Paste** panel on the Home screen with Ctrl+V. You don't need to reformat or re-template anything first.

## What should I do if Clipboard Paste doesn't work?

Open the downloaded file in Excel, press **Ctrl+A** to select everything, **Ctrl+C** to copy, then return to RCC Excel Automation and paste again. This resolves the most common paste issues. If it still doesn't work, you can also use **File Upload** or **Drag & Drop** instead.

## What is Preview Rows?

A display setting (100 / 500 / 1000 / 5000 / All) that controls how many rows the grid actually renders. It does not limit your data - your full dataset is always used for search, sort, and export, no matter what Preview Rows is set to.

## Does Search search all data?

Yes. Search always runs against your entire converted dataset, regardless of the Preview Rows setting. Preview Rows only controls how many of the matches are actually displayed at once.

## Why can "All" be slower?

Selecting Preview Rows = All asks the browser to render every row of your dataset at once, which takes more time and memory the larger your file is. A confirmation appears before this happens so it's never triggered by accident. Your data isn't affected either way - this only changes what's drawn on screen.

## What is a Transformation Rule?

A saved configuration of which output columns appear, in what order, and under what display name. Rules are stored in your browser only. The **Default** rule (always available) shows every column in the standard order.

## How do I change column order?

Open **Settings → Show Advanced Features**, click **Transformation Rules**, then drag a column's handle (⋮⋮) up or down in the list. The Preview grid and your exported file will reflect the new order.

## How do I use Add Description?

Click **Add Description** in the toolbar after converting, then provide a file with `PPID` and `DESC` columns via Upload, Drag & Drop, or Clipboard Paste - all three work identically. See the [User Guide's Add Description section](./USER_GUIDE.md#add-description) for details.

## What happens with duplicate PPIDs?

If your Description data has the same PPID listed more than once, Add Description is rejected with an error listing which PPIDs repeat. There's no reliable way for the app to guess which value you meant, so the source data needs to be fixed (remove or consolidate the duplicate rows) before trying again.

## What happens with unmatched PPIDs?

Any converted row whose PPID has no match in your Description data keeps a `-` in the DESC column, and the Status Bar reports how many PPIDs were unmatched. Nothing else about that row is affected.

## Where is DESC displayed?

Immediately after the `PPID` column, both in the Preview grid and in your exported file - regardless of which Transformation Rule is active or where PPID happens to fall in its column order.

## What is the difference between Quick Save and Save As?

**Quick Save** downloads immediately with an auto-generated filename (`RCC_converted_YYMMDD_HHMMSS.xlsx`) to your browser's default download location. **Save As** opens your operating system's native save dialog so you can choose the folder and filename yourself - this only works in Chrome/Edge-family browsers; other browsers fall back to the same behavior as Quick Save.

## What does Abort do?

Cancels a conversion that's currently running. RCC Excel Automation processes files in a background thread, so Abort genuinely stops that work in progress - it doesn't just hide a result that keeps computing behind the scenes.

## What should I do when an error occurs?

Read the on-screen message first - many are self-explanatory (e.g. an unsupported file type). If it's a genuine problem, open **Error Details** (from the error message, or from Help & Support), click **Copy Log**, and send the copied text to the developer along with a short description of what you were doing. See the [Troubleshooting Guide](./TROUBLESHOOTING.md) for a full walkthrough.

## What is Error Details?

A diagnostic view - **not** a developer Debug Mode - that shows technical information about an error you encountered: when it happened, the app version, the error message, and browser/OS information. It never includes your data (no PPID, TS#, DESC, or file contents) - only technical details useful for fixing the problem.

## How do I copy an error log?

Open Error Details and click the **Copy Log** button. You'll see a short "Log copied to clipboard" confirmation. Paste it wherever you're reporting the issue (email, chat, ticket).
