/**
 * Main-thread client for worker.ts (V1.10 Browser Edition).
 *
 * A single shared Worker instance is reused across requests (this app only
 * ever has one conversion in flight at a time - both HomeScreen and
 * AddDescriptionDialog guard against a second concurrent request). On
 * Abort, the worker is terminated outright (a real cancellation - see
 * worker.ts) and a fresh one is spawned lazily for the next request.
 *
 * The Worker is created lazily, only in a real browser, so importing this
 * module never breaks a non-browser environment (SSR, or Vitest/jsdom -
 * which has no Worker implementation at all). Nothing in the app's test
 * suite exercises this file: every component test mocks `@/lib/api`
 * wholesale, so the real worker only ever runs in an actual browser.
 */

import type { WorkerRequest, WorkerResponse } from "./worker";

/** Carries `isValidationError` across the worker boundary (V1.11) - lets
 * callers skip offering "Show Details"/Copy Log for a validation message
 * that may echo back the user's own data (e.g. a duplicate-PPID list),
 * without needing to parse message text to guess. */
export class WorkerError extends Error {
  isValidationError: boolean;
  constructor(message: string, isValidationError: boolean) {
    super(message);
    this.name = "WorkerError";
    this.isValidationError = isValidationError;
  }
}

// Plain `Omit` doesn't distribute over a union - it collapses WorkerRequest
// to the intersection of its members' keys first, which drops every
// variant-specific field (fileBytes, text, rows, ...). This distributes
// over each member individually before omitting `id`.
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
export type WorkerCall = DistributiveOmit<WorkerRequest, "id">;

type Pending = { resolve: (value: unknown) => void; reject: (reason: unknown) => void };

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, Pending>();

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const msg = event.data;
      const entry = pending.get(msg.id);
      if (!entry) return;
      pending.delete(msg.id);
      if (msg.ok) entry.resolve(msg.result);
      else entry.reject(new WorkerError(msg.error, msg.isValidationError));
    };
    worker.onerror = (event) => {
      // An uncaught error in the worker (rare - engine.ts catches its own
      // exceptions) rejects every still-pending request rather than
      // hanging them forever.
      for (const [id, entry] of pending) {
        entry.reject(new Error(event.message || "Worker error"));
        pending.delete(id);
      }
    };
  }
  return worker;
}

function abortAllPending() {
  for (const [id, entry] of pending) {
    entry.reject(new DOMException("Aborted", "AbortError"));
    pending.delete(id);
  }
  worker?.terminate();
  worker = null;
}

/** Sends `request` (minus `id`, assigned here) to the worker and resolves
 * with its result. If `signal` fires before a response arrives, the worker
 * is terminated (a real cancellation, not just discarding the response) and
 * the promise rejects with a DOMException named "AbortError" - the same
 * shape callers already handle for the old fetch-based Abort. */
export function callWorker<T>(request: WorkerCall, signal?: AbortSignal): Promise<T> {
  if (signal?.aborted) {
    return Promise.reject(new DOMException("Aborted", "AbortError"));
  }

  const id = nextId++;
  const fullRequest = { ...request, id } as WorkerRequest;

  return new Promise<T>((resolve, reject) => {
    const onAbort = () => abortAllPending();
    const cleanup = () => signal?.removeEventListener("abort", onAbort);

    pending.set(id, {
      resolve: (value) => {
        cleanup();
        resolve(value as T);
      },
      reject: (reason) => {
        cleanup();
        reject(reason);
      },
    });

    if (signal) signal.addEventListener("abort", onAbort, { once: true });

    const transfer: Transferable[] =
      request.type === "convertFile" || request.type === "addDescriptionFromFile" ? [request.fileBytes] : [];
    getWorker().postMessage(fullRequest, transfer);
  });
}
