"use client";

import { useCallback, useRef, useState } from "react";
import PreviewTable from "@/components/PreviewTable";
import ConversionSummaryPanel from "@/components/ConversionSummaryPanel";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

type ConversionSummary = {
  ppid_count: number;
  ts_count: number;
  generated_rows: number;
  conversion_time_seconds: number;
};

type ConvertResponse = {
  filename: string;
  columns: string[];
  rows: Record<string, unknown>[];
  total_rows: number;
  file_base64: string;
  summary: ConversionSummary;
};

function base64ToBlob(base64: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

type Mode = "file" | "paste";

export default function Home() {
  const [mode, setMode] = useState<Mode>("file");
  const [file, setFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ConvertResponse | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const switchMode = useCallback((next: Mode) => {
    setMode(next);
    setResult(null);
    setError(null);
  }, []);

  const resetForNewFile = useCallback((f: File) => {
    setFile(f);
    setResult(null);
    setError(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragActive(false);
      const dropped = e.dataTransfer.files?.[0];
      if (dropped) resetForNewFile(dropped);
    },
    [resetForNewFile]
  );

  const handleChoose = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const chosen = e.target.files?.[0];
      if (chosen) resetForNewFile(chosen);
    },
    [resetForNewFile]
  );

  const handleConvert = useCallback(async () => {
    if (mode === "file" && !file) return;
    if (mode === "paste" && !pastedText.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      let res: Response;
      if (mode === "file") {
        const formData = new FormData();
        formData.append("file", file as File);
        res = await fetch(`${API_BASE}/api/convert`, {
          method: "POST",
          body: formData,
        });
      } else {
        res = await fetch(`${API_BASE}/api/convert-text`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: pastedText }),
        });
      }

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail ?? `Conversion failed (${res.status})`);
      }

      const data: ConvertResponse = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error during conversion.");
    } finally {
      setLoading(false);
    }
  }, [mode, file, pastedText]);

  const handleDownload = useCallback(() => {
    if (!result) return;
    const blob = base64ToBlob(result.file_base64);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = result.filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [result]);

  return (
    <main>
      <h1>Excel Automation V1.02</h1>
      <p className="subtitle">
        Upload a PPID / Parameter / Reference Value excel file to convert it into a flat,
        pivot-ready table (one row per TS#).
      </p>

      <div className="tabs">
        <button
          type="button"
          className={`tab${mode === "file" ? " active" : ""}`}
          onClick={() => switchMode("file")}
        >
          파일 업로드
        </button>
        <button
          type="button"
          className={`tab${mode === "paste" ? " active" : ""}`}
          onClick={() => switchMode("paste")}
        >
          붙여넣기
        </button>
      </div>

      {mode === "file" ? (
        <div
          className={`dropzone${dragActive ? " active" : ""}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
        >
          <p>
            {file ? (
              <>
                Selected: <span className="filename">{file.name}</span>
              </>
            ) : (
              "Drag & drop an .xlsx file here, or click to choose one"
            )}
          </p>
          <button
            type="button"
            className="secondary"
            onClick={(e) => {
              e.stopPropagation();
              inputRef.current?.click();
            }}
          >
            Choose File
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xlsm"
            onChange={handleChoose}
            style={{ display: "none" }}
          />
        </div>
      ) : (
        <div className="paste-area">
          <p className="paste-hint">
            엑셀에서 헤더 행(PPID | Parameter | REF...)을 포함해 영역을 선택한 뒤 Ctrl+A → Ctrl+C,
            아래에 Ctrl+V로 붙여넣으세요.
          </p>
          <textarea
            className="paste-textarea"
            placeholder="여기에 붙여넣기 (Ctrl+V)"
            value={pastedText}
            onChange={(e) => {
              setPastedText(e.target.value);
              setResult(null);
              setError(null);
            }}
            rows={10}
          />
        </div>
      )}

      <div className="actions">
        <button
          type="button"
          className="primary"
          disabled={(mode === "file" ? !file : !pastedText.trim()) || loading}
          onClick={handleConvert}
        >
          {loading && <span className="spinner" />}
          {loading ? "Converting..." : "Convert"}
        </button>
        {result && (
          <button type="button" className="secondary" onClick={handleDownload}>
            Download {result.filename}
          </button>
        )}
      </div>

      {error && <div className="error">{error}</div>}

      {result && (
        <div className="results">
          <ConversionSummaryPanel summary={result.summary} />
          <h2>Preview</h2>
          <PreviewTable columns={result.columns} rows={result.rows} />
        </div>
      )}
    </main>
  );
}
