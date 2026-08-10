/**
 * Film Material value parser (V1.12 Film Material Visualization).
 *
 * Naming convention (spec section 8): `<prefix>_<structure>_<...rest>` or
 * `<prefix>_<structure>_<bottom>_<...rest>` - the field immediately after
 * the Material Structure is treated as an explicit Bottom Material only
 * when it's a registered Material Code; otherwise it's just part of the
 * trailing numeric/identifier fields and Bottom defaults to "Si".
 *
 * The Material Structure itself is tokenized Longest Match First against
 * the Material DB (section 9) - greedy, left to right, no backtracking.
 * This is sufficient (not just convenient) for every case the spec
 * describes: the DB's codes are unambiguous enough that a longer match at
 * a given position is never wrong to take. If a position matches no known
 * code at any length, parsing stops there and reports that single
 * character as the unknown Material - never a partial/guessed structure.
 */

import type { MaterialDbOk } from "./materialDb";

export type FilmMaterialParseOk = { status: "ok"; layers: string[] }; // top -> bottom, Si last unless overridden
export type FilmMaterialParseError = { status: "error"; unknownMaterial: string };
export type FilmMaterialParseResult = FilmMaterialParseOk | FilmMaterialParseError;

const DEFAULT_BOTTOM = "Si";

function tokenizeLongestMatchFirst(
  structure: string,
  codesLongestFirst: string[],
  entries: Map<string, string>
): { status: "ok"; tokens: string[] } | FilmMaterialParseError {
  const maxLen = codesLongestFirst.length > 0 ? codesLongestFirst[0].length : 1;
  const tokens: string[] = [];
  let i = 0;
  while (i < structure.length) {
    let matchedLen = 0;
    for (let len = Math.min(maxLen, structure.length - i); len >= 1; len--) {
      if (entries.has(structure.slice(i, i + len))) {
        matchedLen = len;
        break;
      }
    }
    if (matchedLen === 0) {
      return { status: "error", unknownMaterial: structure[i] };
    }
    tokens.push(structure.slice(i, i + matchedLen));
    i += matchedLen;
  }
  return { status: "ok", tokens };
}

/**
 * Parses a Film Material value (e.g. `MOCK_ABCDBA_001_X_002` or
 * `MOCK_ABCDBA_Si_001_X_002`) into its TOP -> BOTTOM layer list.
 */
export function parseFilmMaterialValue(rawValue: string, db: MaterialDbOk): FilmMaterialParseResult {
  const parts = rawValue.split("_");
  if (parts.length < 2 || parts[1] === "") {
    // Not the expected `<prefix>_<structure>_...` shape at all - nothing
    // to guess at, report the whole value rather than rendering anything.
    return { status: "error", unknownMaterial: rawValue };
  }

  const structure = parts[1];
  const thirdField = parts[2];
  const explicitBottom = thirdField !== undefined && db.entries.has(thirdField) ? thirdField : null;

  const tokenized = tokenizeLongestMatchFirst(structure, db.codesLongestFirst, db.entries);
  if (tokenized.status === "error") return tokenized;

  return { status: "ok", layers: [...tokenized.tokens, explicitBottom ?? DEFAULT_BOTTOM] };
}
