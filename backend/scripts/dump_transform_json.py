# -*- coding: utf-8 -*-
"""V1.10 regression tool: dumps ExcelTransformer's output for a given input
file as JSON, sorted by (PPID, TS#) for stable comparison.

Used to verify the V1.10 Browser Edition's JS/TS transformer port produces
byte-identical results to the V1.09 Python engine on real fixture files
(see frontend/lib/converter/regression.test.ts, which loads the JSON this
script produces and compares it against the JS engine's own output for the
same input file).

Usage: python dump_transform_json.py <input_file> <output_json>
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.services.excel_transformer import ExcelTransformer
from app.utils.excel_io import read_raw_rows


def main() -> None:
    if len(sys.argv) != 3:
        print("Usage: python dump_transform_json.py <input_file> <output_json>", file=sys.stderr)
        sys.exit(1)

    input_path, output_path = sys.argv[1], sys.argv[2]
    file_bytes = Path(input_path).read_bytes()

    raw_rows = read_raw_rows(file_bytes)
    df = ExcelTransformer().transform(raw_rows)
    df = df.sort_values(by=["PPID", "TS#"]).reset_index(drop=True)

    records = json.loads(df.to_json(orient="records"))
    Path(output_path).write_text(json.dumps(records, indent=None), encoding="utf-8")
    print(f"Wrote {len(records)} rows to {output_path}")


if __name__ == "__main__":
    main()
