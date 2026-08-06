/**
 * Centralized backend API client.
 *
 * Every fetch call, the base URL, and response-shape types live here so
 * components never duplicate this plumbing (previously `API_BASE` and the
 * convert/export fetch logic were copy-pasted across UploadDialog and
 * page.tsx).
 */

import type { TransformationRule } from "./rules";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

export type ConversionSummary = {
  ppid_count: number;
  ts_count: number;
  generated_rows: number;
  conversion_time_seconds: number;
};

export type DebugInfo = {
  stages_seconds: Record<string, number>;
  total_seconds: number;
  peak_memory_mb: number;
  engine_used: string;
};

export type ConvertResponse = {
  filename: string;
  columns: string[];
  rows: Record<string, unknown>[];
  total_rows: number;
  summary: ConversionSummary;
  debug: DebugInfo | null;
};

export type ExportResponse = {
  filename: string;
  file_base64: string;
};

export class ApiError extends Error {}

async function parseErrorDetail(res: Response, fallback: string): Promise<string> {
  const body = await res.json().catch(() => null);
  return (body && typeof body.detail === "string" && body.detail) || fallback;
}

export async function convertFile(file: File, debug = false): Promise<ConvertResponse> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/api/convert${debug ? "?debug=true" : ""}`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new ApiError(await parseErrorDetail(res, `Conversion failed (${res.status})`));
  return res.json();
}

export async function convertText(text: string, debug = false): Promise<ConvertResponse> {
  const res = await fetch(`${API_BASE}/api/convert-text${debug ? "?debug=true" : ""}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new ApiError(await parseErrorDetail(res, `Conversion failed (${res.status})`));
  return res.json();
}

export async function exportRows(
  filename: string,
  rows: Record<string, unknown>[],
  rule: TransformationRule
): Promise<ExportResponse> {
  const res = await fetch(`${API_BASE}/api/export`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename, rows, rule }),
  });
  if (!res.ok) throw new ApiError(await parseErrorDetail(res, `Export failed (${res.status})`));
  return res.json();
}

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/health`);
    return res.ok;
  } catch {
    return false;
  }
}

export async function getBackendVersion(): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/api/version`);
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data.version === "string" ? data.version : null;
  } catch {
    return null;
  }
}

function base64ToBlob(base64: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

/** Triggers a browser download for a base64-encoded file from the API. */
export function downloadBase64File(filename: string, base64: string): void {
  const blob = base64ToBlob(base64);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
