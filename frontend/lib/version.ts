/**
 * Single source of truth for the version shown in the About dialog - the
 * header itself no longer hardcodes a version string (V1.05 requirement).
 *
 * GIT_TAG/BUILD_DATE are set by hand at release time. V1.05's spec
 * explicitly doesn't require full CI/CD - in a future version these would
 * be injected automatically at build time (e.g. from `git describe --tags`
 * and the build timestamp) instead of hand-edited here.
 */
export const FRONTEND_VERSION = "1.13.0";
export const GIT_TAG = "v1.13";
export const BUILD_DATE = "2026-08-11";

/** V1.10: a temporary Browser Edition (GitHub Pages, no backend) run
 * alongside the preserved Python/FastAPI V1.09 release - see
 * `browser-edition` branch vs `release/v1.09`. */
export const EDITION = "Browser Edition";
