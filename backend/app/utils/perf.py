# -*- coding: utf-8 -*-
"""Lightweight performance measurement helpers.

Used by both Debug Mode (app/api/routes.py, opt-in per request) and the
standalone benchmark harness (scripts/benchmark.py) - one implementation
instead of two copies drifting apart.
"""

import gc
import threading

import psutil


class PeakMemorySampler:
    """Samples this process's RSS on a background thread and tracks the max
    seen while the `with` block is active. Threaded sampling is necessary
    because pandas/numpy allocate native buffers that tracemalloc (Python
    heap only) would miss entirely."""

    def __init__(self, interval_seconds: float = 0.02):
        self._interval = interval_seconds
        self._process = psutil.Process()
        self._stop = threading.Event()
        self._peak_bytes = 0
        self._thread: threading.Thread | None = None

    def _run(self):
        while not self._stop.is_set():
            rss = self._process.memory_info().rss
            if rss > self._peak_bytes:
                self._peak_bytes = rss
            self._stop.wait(self._interval)

    def __enter__(self) -> "PeakMemorySampler":
        gc.collect()
        self._peak_bytes = self._process.memory_info().rss
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._thread.start()
        return self

    def __exit__(self, *exc):
        self._stop.set()
        if self._thread:
            self._thread.join(timeout=1)

    @property
    def peak_mb(self) -> float:
        return self._peak_bytes / (1024 * 1024)
