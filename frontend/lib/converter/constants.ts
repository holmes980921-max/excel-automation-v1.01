/**
 * Output shape constants - a direct TS port of
 * backend/app/models/constants.py (V1.10 Browser Edition).
 *
 * FULL_OUTPUT_COLUMNS is derived from `BASE_COLUMNS` in `@/lib/rules`
 * (not redefined here) so the two never drift apart - `lib/rules.ts` is
 * reused unchanged from V1.09 and already carries the authoritative column
 * list used for rule editing/preview.
 */

import { BASE_COLUMNS } from "@/lib/rules";

export const FULL_OUTPUT_COLUMNS: string[] = [...BASE_COLUMNS];

// Everything after PPID/TS# - the fields a TS# block can actually carry.
export const OUTPUT_COLUMNS: string[] = FULL_OUTPUT_COLUMNS.slice(2);

export const MISSING_VALUE = "-";
export const MAX_TS_NUMBER = 10;
export const BLOCK_SEPARATOR_PARAMETER = "PPID";
export const TS_LABEL_PREFIX = "TS#";
