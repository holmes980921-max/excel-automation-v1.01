# -*- coding: utf-8 -*-
"""Excel Automation - FastAPI entry point.

Security notes (see project spec):
- No uploaded file is ever written to disk (all processing is in-memory).
- No database is used.
- Excel contents are never logged - only structural facts (row/col counts,
  timings, exception types/messages).
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import router as excel_router
from app.utils.logging_config import configure_logging, get_logger

configure_logging(debug_mode=False)
error_log = get_logger("error")

APP_VERSION = "1.8.0"

app = FastAPI(title="Excel Automation", version=APP_VERSION)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

app.include_router(excel_router)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Last line of defense: every route already handles its own expected
    failure modes, but anything that still slips through (a bug, an
    unexpected library error) should produce a clean generic error instead
    of a raw traceback leaking to the client - while the real detail still
    goes to the error log for debugging."""
    error_log.error("Unhandled exception on %s %s", request.method, request.url.path, exc_info=exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected server error occurred. Please try again."},
    )


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/version")
async def version() -> dict[str, str]:
    """Backs the frontend's About dialog - avoids hardcoding the version
    string in the UI (V1.05 requirement)."""
    return {"version": APP_VERSION}
