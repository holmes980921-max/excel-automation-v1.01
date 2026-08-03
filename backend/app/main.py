# -*- coding: utf-8 -*-
"""Excel Automation V1.01 - FastAPI entry point.

Security notes (see project spec):
- No uploaded file is ever written to disk (all processing is in-memory).
- No database is used.
- Excel contents are never logged - only structural facts (row/col counts).
"""

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router as excel_router

# Keep logging structural only - never log request bodies or file contents.
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

app = FastAPI(title="Excel Automation V1.01", version="1.0.1")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

app.include_router(excel_router)


@app.get("/api/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
