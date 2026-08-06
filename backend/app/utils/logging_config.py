# -*- coding: utf-8 -*-
"""Structured logging setup.

Every log line is tagged with a category (Application / Error / Performance
/ Debug) so logs can be filtered/routed without parsing message text. As
with every other part of this app: never log excel contents - only
structural facts (row/column counts, timings, exception types).
"""

import logging
import sys

_CATEGORIES = ("application", "error", "performance", "debug")


class _CategoryFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        if not hasattr(record, "category"):
            record.category = "application"
        return super().format(record)


def configure_logging(debug_mode: bool = False) -> None:
    """Call once at startup. debug_mode also lowers the root level so
    Debug-category log calls are actually emitted."""
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(
        _CategoryFormatter(fmt="%(asctime)s [%(category)-11s] %(levelname)-8s %(name)s: %(message)s")
    )
    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(logging.DEBUG if debug_mode else logging.INFO)


def get_logger(category: str) -> logging.LoggerAdapter:
    """category: one of 'application' | 'error' | 'performance' | 'debug'."""
    if category not in _CATEGORIES:
        raise ValueError(f"Unknown log category {category!r}, expected one of {_CATEGORIES}")
    logger = logging.getLogger(f"app.{category}")
    return logging.LoggerAdapter(logger, {"category": category})
