/**
 * Structured error log for the Error Log Viewer (V1.09 supportability).
 *
 * Deliberately narrow: timestamp, app version, a short operation label, the
 * error message/stack, and coarse environment info (user agent, viewport
 * size). Nothing here ever includes application data (PPID/excel content) -
 * this only ever gets built from a caught JS Error and static app metadata,
 * never from converted rows or uploaded file content.
 */

import { FRONTEND_VERSION, GIT_TAG } from "./version";

export type ErrorLogEntry = {
  timestamp: string;
  appVersion: string;
  operation: string;
  message: string;
  stack: string;
  environment: string;
};

function getEnvironmentInfo(): string {
  if (typeof navigator === "undefined" || typeof window === "undefined") return "unknown";
  return `${navigator.userAgent} | viewport ${window.innerWidth}x${window.innerHeight}`;
}

export function buildErrorLogEntry(params: {
  error: Error;
  operation: string;
  componentStack?: string | null;
}): ErrorLogEntry {
  const stackParts = [params.error.stack ?? params.error.message];
  if (params.componentStack) {
    stackParts.push(`Component stack:${params.componentStack}`);
  }

  return {
    timestamp: new Date().toISOString(),
    appVersion: `${FRONTEND_VERSION} (${GIT_TAG})`,
    operation: params.operation,
    message: params.error.message || "(no message)",
    stack: stackParts.join("\n\n"),
    environment: getEnvironmentInfo(),
  };
}

/** Plain-text rendering, easy to paste into a bug report as-is. */
export function formatErrorLog(entry: ErrorLogEntry): string {
  return [
    `Timestamp: ${entry.timestamp}`,
    `Application Version: ${entry.appVersion}`,
    `Operation: ${entry.operation}`,
    `Error Message: ${entry.message}`,
    `Environment: ${entry.environment}`,
    "",
    "Stack Trace:",
    entry.stack,
  ].join("\n");
}
