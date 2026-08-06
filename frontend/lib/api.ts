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

export type AddDescriptionResponse = {
  columns: string[];
  rows: Record<string, unknown>[];
  total_rows: number;
  matched_count: number;
  unmatched_count: number;
  unmatched_ppids: string[];
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

export async function addDescription(
  file: File,
  rows: Record<string, unknown>[]
): Promise<AddDescriptionResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("rows", JSON.stringify(rows));
  const res = await fetch(`${API_BASE}/api/add-description`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new ApiError(await parseErrorDetail(res, `Add Description failed (${res.status})`));
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

export function base64ToBlob(base64: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

/** Triggers a browser download for a base64-encoded file from the API.
 * Used for Quick Save - immediate, no dialog, goes to the browser's
 * configured default download location. */
export function downloadBase64File(filename: string, base64: string): void {
  const blob = base64ToBlob(base64);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export type SaveAsResult = "saved" | "cancelled" | "fallback";

/**
 * Save As (V1.06): opens the OS-native save dialog via the File System
 * Access API (Chromium-based browsers only) so the user can freely choose
 * folder/filename. On browsers without that API (Firefox, Safari), falls
 * back to the same download-trigger Quick Save uses - most browsers'
 * "always ask where to save" setting still surfaces a save dialog there,
 * just not one this app controls.
 *
 * There is no browser API to reveal a saved file in the OS file explorer
 * ("Open Folder") - that would require filesystem access no sandboxed web
 * page is granted, so that affordance isn't offered after a save.
 */
export async function saveAs(filename: string, base64: string): Promise<SaveAsResult> {
  const blob = base64ToBlob(base64);

  if (typeof window !== "undefined" && window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [
          {
            description: "Excel Workbook",
            accept: { "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"] },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return "saved";
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return "cancelled";
      throw err;
    }
  }

  downloadBase64File(filename, base64);
  return "fallback";
}
