/**
 * Default save filename (V1.06 Quick Save / Save As).
 *
 * Format: RCC_converted_YYMMDD_HHMMSS.xlsx (2-digit year) - a pure function
 * over a supplied Date so it's unit-testable without faking the system
 * clock inside a component.
 */

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function generateDefaultFilename(now: Date = new Date()): string {
  const yy = pad2(now.getFullYear() % 100);
  const mm = pad2(now.getMonth() + 1);
  const dd = pad2(now.getDate());
  const hh = pad2(now.getHours());
  const mi = pad2(now.getMinutes());
  const ss = pad2(now.getSeconds());
  return `RCC_converted_${yy}${mm}${dd}_${hh}${mi}${ss}.xlsx`;
}
