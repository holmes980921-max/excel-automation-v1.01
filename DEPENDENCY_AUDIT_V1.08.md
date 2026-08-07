# Excel Automation V1.08 - Dependency Audit Report

**Method**: every third-party import actually used in application code (`backend/app/`,
`backend/scripts/`, `frontend/app/`, `frontend/components/`, `frontend/lib/`) was extracted and
cross-checked against `requirements.txt`/`package.json`, in both directions - looking for
**missing** declarations (imported but not declared - a clean-install failure risk) and **unused**
declarations (declared but never imported - dead weight). A genuinely clean install was then
verified for the backend by installing into a fresh virtual environment from `requirements.txt`
alone (no dev venv reuse) and exercising the code path that would have failed.

## Finding 1 (critical): `psutil` was missing from `requirements.txt`

`backend/app/utils/perf.py` (`PeakMemorySampler`) does `import psutil` and is used **unconditionally**
on every `/api/convert` and `/api/convert-text` request (not just when Debug Mode is on) - it isn't
an optional/dev-only dependency, it's on the hot path. It was never listed in `requirements.txt`.

**Impact**: a genuinely clean `pip install -r requirements.txt` followed by starting the server and
converting a file would have crashed with `ModuleNotFoundError: No module named 'psutil'` on the
very first request. This had gone unnoticed because every development/testing session in this
project's history reused an existing `.venv` that already had `psutil` installed (likely pulled in
transitively at some point, or installed ad hoc during V1.05's `PeakMemorySampler` work and never
added to the manifest) - `requirements.txt` itself was never actually the source of truth for what
the dev environment had installed until this audit checked.

**Fix**: added `psutil>=6.0` to `requirements.txt`. Verified by installing into a **fresh** venv
(not the existing dev one) from `requirements.txt` alone and successfully importing `app.main` and
exercising `PeakMemorySampler` - this exact sequence would have failed with the missing-module
error before the fix, and now succeeds. This is the single most concrete, production-readiness-
relevant finding in this release: without it, `pip install -r requirements.txt` followed by
`uvicorn app.main:app` was **not** actually a working clean install path, contrary to what every
prior version's README claimed.

## Finding 2 (minor): `numpy` was relied on transitively, not declared directly

`backend/app/api/routes.py` does `import numpy as np` directly (used for the `NaN` -> `None` JSON
fix-up). This was never a clean-install failure risk - `numpy` is a hard dependency of `pandas`
itself, so `pip install -r requirements.txt` always pulls in a compatible version regardless.
Declaring it explicitly is a best-practice fix, not a bug fix: a direct import should have a direct
declaration, so the version actually in use is visible and pin-able independently of whatever
version `pandas` happens to require in the future, rather than being an invisible transitive
dependency. Added `numpy>=1.26` to `requirements.txt`.

## Finding 3 (minor): unused frontend dev dependency

`@testing-library/user-event` (`^14.6.3`, devDependency) was never imported anywhere in the test
suite - `fireEvent` (from `@testing-library/react`) is what every existing test actually uses.
Removed via `npm uninstall @testing-library/user-event`; `package-lock.json` updated accordingly.
Zero risk (dev-only, unused, confirmed via a full-codebase search before removal).

## Finding 4 (informational, not fixed this version): 3 high-severity `npm audit` findings

`npm audit` reports 3 high-severity advisories, all transitive through `next@15.5.22`'s own
dependencies (`postcss`, `sharp`). `npm audit fix --force` would resolve them by installing
`next@16.3.0` - **a major-version upgrade of the core framework**, which is explicitly a breaking
change outside this version's "no new functionality, minimize regression risk" mandate and
outside what a dependency-cleanup pass should decide unilaterally. **Not fixed this version** -
flagged here for a deliberate decision rather than either silently upgrading (high regression
risk for a UX-only-tested release cycle) or silently ignoring (a real, disclosed security
posture gap). See `CODE_REVIEW_V1.08.md`'s "Recommended for V1.09+" section.

## Everything else: verified present and used

**Backend** (`requirements.txt`): `fastapi`, `uvicorn[standard]`, `pandas`, `python-calamine`,
`openpyxl`, `xlrd`, `lxml`, `python-multipart`, `pydantic` - each has a confirmed direct import
in application code. `requirements-dev.txt` (`xlwt`, `pytest`, `pytest-cov`, `httpx`) - each
confirmed used (`xlwt` by `scripts/make_mock.py`'s legacy-`.xls` path only, correctly kept out of
the production manifest; the rest by the test suite).

**Frontend** (`package.json` `dependencies`): `@dnd-kit/*` (RuleEditor drag-reorder), `@emotion/*`
(not directly imported - required as a peer dependency by `@mui/material-nextjs`'s SSR cache
provider, confirmed legitimate rather than unused), `@mui/material`/`@mui/material-nextjs`,
`ag-grid-community`/`ag-grid-react`, `lucide-react`, `next`, `react`/`react-dom`, `react-dropzone`,
`sonner` - all confirmed used. `devDependencies` - all confirmed used after removing Finding 3.

## Definition of Done

- [x] No missing runtime dependencies - `psutil` (critical) and `numpy` (best-practice) added.
- [x] No unnecessary dependencies - `@testing-library/user-event` removed; nothing else found
      unused.
- [x] Clean environment runs without manual package installation - verified by installing the
      backend into a fresh virtual environment from `requirements.txt` alone and successfully
      running a real request path that depends on every declared package, including the
      previously-missing `psutil`.
