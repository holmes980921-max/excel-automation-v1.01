# Changelog

## v1.02

### Added
- Client-side Search (case-insensitive, partial match, all columns, result count, clear button)
- Client-side Sorting (3-state per-column toggle: ascending → descending → original order)
- Resizable Columns (drag-to-resize, minimum width, persists during search/sort)
- Conversion Summary panel (PPID Count, TS Count, Generated Rows, Conversion Time)
- Flexible Input Columns (extra/reordered columns beyond PPID/Parameter/Reference Value are
  ignored; columns resolved by header name with a positional fallback)
- Clipboard-paste input mode (`POST /api/convert-text`) as an alternative to file upload
- `backend/scripts/make_mock.py` - production-like mock data generator for manual/regression testing

### Changed
- TS output format changed from numeric (`1`, `2`, ...) to `TS#1`, `TS#2`, ... in both the
  preview table and the downloaded excel file
- API response now returns the full converted dataset (`rows`) instead of a 50-row preview, so
  client-side search/sort/resize have complete data without extra requests

### Fixed
- Natural sorting for the TS# column (and, as a side effect of using a general-purpose natural
  comparator, for any other alphanumeric column) - `TS#2` now correctly sorts before `TS#10`

---

## v1.01

Initial Release

- Upload (drag & drop / file picker) or clipboard-paste a PPID / Parameter / Reference Value
  excel export
- Parses `PPID` separator rows and `TS#<n>_<field>` parameters, grouping into one output row per
  `(PPID, TS#)` pair
- Fixed output columns: `PPID, TS#, CardName, FilmMaterial, CorrelationCard_1, CorrelationCard_2,
  CorrelationCard_3, DataCombination, DataFeedFoward`; missing fields filled with `"-"`
- Preview table + one-click download of the converted `.xlsx`
- Nothing written to disk server-side; no database
