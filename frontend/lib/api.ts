/**
 * Local conversion API (V1.10 Browser Edition).
 *
 * Same public interface as V1.09's backend-calling `lib/api.ts` (function
 * names, parameter shapes, response types) so every component that used to
 * import from here (HomeScreen, AddDescriptionDialog, page.tsx,
 * AboutDialog...) needed no changes beyond what V1.10 explicitly adds
 * (Add Description clipboard paste). Every call that used to be an HTTP
 * request to FastAPI now runs in `converter/worker.ts` via
 * `converter/workerClient.ts` - there is no backend, no network request,
 * and no server to be unavailable.
 */

import type { TransformationRule } from "./rules";
import { callWorker, WorkerError, type WorkerCall } from "./converter/workerClient";
import type { ConvertResult, AddDescriptionResult, ConversionSummary, DebugInfo } from "./converter/engine";

export type { ConversionSummary, DebugInfo };

export type ConvertResponse = ConvertResult;

export type ExportResponse = {
  filename: string;
  file_base64: string;
};

export type AddDescriptionResponse = AddDescriptionResult;

export class ApiError extends Error {
  /** V1.11: true for an expected validation failure (e.g. "Description
   * file has duplicate PPID(s): ...") whose message may echo back the
   * user's own data - callers should not offer a copyable diagnostic log
   * for this class of error. See lib/converter/worker.ts. */
  isValidationError: boolean;
  constructor(message: string, isValidationError = false) {
    super(message);
    this.isValidationError = isValidationError;
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  // Chunked to avoid blowing the call stack on String.fromCharCode(...bytes)
  // for large exports.
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function runOrWrap<T>(request: WorkerCall, signal?: AbortSignal): Promise<T> {
  try {
    return await callWorker<T>(request, signal);
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    if (err instanceof WorkerError) throw new ApiError(err.message, err.isValidationError);
    throw new ApiError(err instanceof Error ? err.message : "Conversion failed");
  }
}

export async function convertFile(file: File, debug = false, signal?: AbortSignal): Promise<ConvertResponse> {
  const fileBytes = await file.arrayBuffer();
  return runOrWrap<ConvertResponse>(
    { type: "convertFile", fileBytes, originalFilename: file.name, debug },
    signal
  );
}

export async function convertText(text: string, debug = false, signal?: AbortSignal): Promise<ConvertResponse> {
  return runOrWrap<ConvertResponse>({ type: "convertText", text, debug }, signal);
}

export async function exportRows(
  filename: string,
  rows: Record<string, unknown>[],
  rule: TransformationRule
): Promise<ExportResponse> {
  const result = await runOrWrap<{ filename: string; buffer: ArrayBuffer }>({
    type: "exportRows",
    filename,
    rows,
    rule,
  });
  return { filename: result.filename, file_base64: arrayBufferToBase64(result.buffer) };
}

export async function addDescription(
  file: File,
  rows: Record<string, unknown>[]
): Promise<AddDescriptionResponse> {
  const fileBytes = await file.arrayBuffer();
  return runOrWrap<AddDescriptionResponse>({ type: "addDescriptionFromFile", fileBytes, baseRows: rows });
}

/**
 * Add Description via clipboard paste (V1.10 - fixes the V1.09 gap where
 * only Drag & Drop / Upload were supported). Accepts whatever the paste
 * event's `clipboardData` actually carried; `text/html` is preferred when
 * present (Excel always includes it, and it survives a literal tab/newline
 * inside a DESC cell), falling back to `text/plain` TSV otherwise - see
 * `converter/engine.ts`'s `addDescriptionFromClipboard` for the shared
 * normalization pipeline all three input methods funnel through.
 */
export async function addDescriptionFromClipboard(
  clipboard: { html?: string; text?: string },
  rows: Record<string, unknown>[]
): Promise<AddDescriptionResponse> {
  return runOrWrap<AddDescriptionResponse>({ type: "addDescriptionFromClipboard", clipboard, baseRows: rows });
}

export function base64ToBlob(base64: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

/** Triggers a browser download for a base64-encoded file. Used for Quick
 * Save - immediate, no dialog, goes to the browser's configured default
 * download location. Unchanged from V1.09 - this never talked to the
 * backend in the first place. */
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
 * back to the same download-trigger Quick Save uses. Unchanged from
 * V1.09 - this never talked to the backend in the first place.
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
