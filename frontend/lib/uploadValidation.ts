/**
 * Pure upload-validation logic, split out of UploadDialog.tsx so it's
 * directly unit-testable without mounting a component or simulating a
 * real drag-and-drop event (V1.05: "write code that is easy to test").
 */

import type { FileRejection } from "react-dropzone";

export const ACCEPTED_FILE_TYPES = {
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
  "application/vnd.ms-excel.sheet.macroEnabled.12": [".xlsm"],
  "application/vnd.ms-excel": [".xls"],
};

export function describeRejection(rejection: FileRejection): string {
  const code = rejection.errors[0]?.code;
  if (code === "file-invalid-type") {
    return `"${rejection.file.name}" isn't a supported file type. Please use .xls, .xlsx, or .xlsm.`;
  }
  if (code === "too-many-files") {
    return "Please drop a single file at a time.";
  }
  return rejection.errors[0]?.message ?? `"${rejection.file.name}" could not be used.`;
}
