/**
 * Web Worker entry point (V1.10 Browser Edition).
 *
 * Runs the conversion engine off the main thread for two reasons:
 *  1. Genuine Abort. V1.09's Abort only cancelled the client's `fetch` -
 *     the backend's already-started computation ran to completion
 *     regardless, its result simply discarded. A browser main thread is
 *     synchronous, so without a worker there would be no way to interrupt
 *     an in-progress conversion at all. `workerClient.ts` calls
 *     `worker.terminate()` on abort, which actually stops the computation -
 *     an improvement over V1.09's "fake" abort, not a regression.
 *  2. Keeps the UI responsive while parsing/transforming large files,
 *     without any bespoke chunking/scheduling logic.
 *
 * Deliberately thin: every request just calls straight into engine.ts and
 * reports success/failure. All the actual logic - and everything unit
 * tested - lives in engine.ts, which has no dependency on Worker/DOM APIs
 * and can be (and is) tested directly under Vitest/jsdom.
 */

import * as engine from "./engine";
import type { TransformationRule } from "@/lib/rules";

export type WorkerRequest =
  | { id: number; type: "convertFile"; fileBytes: ArrayBuffer; originalFilename: string | null; debug: boolean }
  | { id: number; type: "convertText"; text: string; debug: boolean }
  | { id: number; type: "exportRows"; filename: string; rows: Record<string, unknown>[]; rule: TransformationRule | null }
  | { id: number; type: "addDescriptionFromFile"; fileBytes: ArrayBuffer; baseRows: Record<string, unknown>[] }
  | {
      id: number;
      type: "addDescriptionFromClipboard";
      clipboard: { html?: string; text?: string };
      baseRows: Record<string, unknown>[];
    };

export type WorkerResponse =
  | { id: number; ok: true; result: unknown; transferBuffer?: ArrayBuffer }
  | { id: number; ok: false; error: string; isValidationError: boolean };

const ctx = self as unknown as Worker;

ctx.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const msg = event.data;
  try {
    switch (msg.type) {
      case "convertFile": {
        const result = engine.convertFile(new Uint8Array(msg.fileBytes), msg.originalFilename, msg.debug);
        ctx.postMessage({ id: msg.id, ok: true, result } satisfies WorkerResponse);
        break;
      }
      case "convertText": {
        const result = engine.convertText(msg.text, msg.debug);
        ctx.postMessage({ id: msg.id, ok: true, result } satisfies WorkerResponse);
        break;
      }
      case "exportRows": {
        const { filename, blob } = engine.exportRows(msg.filename, msg.rows, msg.rule);
        const buffer = await blob.arrayBuffer();
        ctx.postMessage({ id: msg.id, ok: true, result: { filename, buffer } } satisfies WorkerResponse, [buffer]);
        break;
      }
      case "addDescriptionFromFile": {
        const result = engine.addDescriptionFromFile(new Uint8Array(msg.fileBytes), msg.baseRows);
        ctx.postMessage({ id: msg.id, ok: true, result } satisfies WorkerResponse);
        break;
      }
      case "addDescriptionFromClipboard": {
        const result = engine.addDescriptionFromClipboard(msg.clipboard, msg.baseRows);
        ctx.postMessage({ id: msg.id, ok: true, result } satisfies WorkerResponse);
        break;
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // V1.11: a validation error's message (e.g. a duplicate-PPID list) can
    // legitimately echo back the user's own data - appropriate for the
    // inline on-screen message, but not for a copyable diagnostic log.
    // `isValidationError` lets the UI layer skip offering "Show Details"
    // for exactly that class of error. Checked via `.name` (set explicitly
    // in InvalidExcelFormatError's constructor) rather than `instanceof`,
    // since class identity doesn't survive the structured-clone boundary
    // this postMessage crosses.
    const isValidationError = err instanceof Error && err.name === "InvalidExcelFormatError";
    ctx.postMessage({ id: msg.id, ok: false, error: message, isValidationError } satisfies WorkerResponse);
  }
};
