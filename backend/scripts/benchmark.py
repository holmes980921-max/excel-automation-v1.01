# -*- coding: utf-8 -*-
"""Performance benchmark harness for the transformation pipeline.

Measures, for a given input file:
  - Wall-clock time per stage (read, transform, summarize, xlsx-write)
  - Peak process RSS memory during the whole run (sampled via psutil on a
    background thread, since pandas/numpy allocate native buffers that
    tracemalloc's Python-heap tracking would miss)
  - Rows/sec throughput

Run directly: python scripts/benchmark.py [xlsx_path] [--label V1.04]
Writes a JSON result file next to the input for the report generator to
pick up (scripts/bench_result_<label>.json).
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.services.excel_transformer import ExcelTransformer  # noqa: E402
from app.utils.excel_io import dataframe_to_xlsx_bytes, read_raw_rows  # noqa: E402
from app.utils.perf import PeakMemorySampler  # noqa: E402


def run_benchmark(xlsx_path: str, label: str, include_xlsx_write: bool) -> dict:
    file_bytes = Path(xlsx_path).read_bytes()
    input_size_mb = len(file_bytes) / (1024 * 1024)

    stages: dict[str, float] = {}

    with PeakMemorySampler() as sampler:
        t0 = time.perf_counter()
        raw_rows = read_raw_rows(file_bytes)
        t1 = time.perf_counter()
        stages["read_and_parse"] = t1 - t0

        transformer = ExcelTransformer()
        result_df = transformer.transform(raw_rows)
        t2 = time.perf_counter()
        stages["transform"] = t2 - t1

        summary = transformer.summarize(result_df, t2 - t0)
        t3 = time.perf_counter()
        stages["summarize"] = t3 - t2

        if include_xlsx_write:
            dataframe_to_xlsx_bytes(result_df)
            t4 = time.perf_counter()
            stages["xlsx_write"] = t4 - t3
        else:
            t4 = t3

        peak_mb = sampler.peak_mb

    total_time = t4 - t0
    input_rows = len(raw_rows)
    output_rows = len(result_df)

    result = {
        "label": label,
        "input_file": str(xlsx_path),
        "input_size_mb": round(input_size_mb, 2),
        "input_rows": input_rows,
        "output_rows": output_rows,
        "ppid_count": summary.ppid_count,
        "stages_seconds": {k: round(v, 3) for k, v in stages.items()},
        "total_seconds": round(total_time, 3),
        "peak_memory_mb": round(peak_mb, 1),
        "rows_per_second": round(input_rows / total_time, 1) if total_time > 0 else None,
        "includes_xlsx_write": include_xlsx_write,
    }
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("xlsx_path", nargs="?", default=str(Path(__file__).parent / "bench_300k.xlsx"))
    parser.add_argument("--label", default="unlabeled")
    parser.add_argument(
        "--include-xlsx-write",
        action="store_true",
        help="Also time writing the result back out as .xlsx (V1.04's /api/convert did this on every call; V1.05 no longer does - pass this flag only for the V1.04 baseline run)",
    )
    args = parser.parse_args()

    result = run_benchmark(args.xlsx_path, args.label, args.include_xlsx_write)
    print(json.dumps(result, indent=2))

    out_path = Path(__file__).parent / f"bench_result_{args.label}.json"
    out_path.write_text(json.dumps(result, indent=2))
    print(f"\nSaved to {out_path}")
