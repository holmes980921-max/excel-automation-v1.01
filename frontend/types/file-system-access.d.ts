/**
 * Minimal ambient types for the File System Access API's showSaveFilePicker
 * (Chromium-only; used by lib/api.ts's saveAs() for the Save As dialog).
 * Not part of TypeScript's bundled lib.dom.d.ts as of TS 5.9.
 */

interface FileSystemWritableFileStream {
  write(data: Blob | BufferSource | string): Promise<void>;
  close(): Promise<void>;
}

interface FileSystemFileHandle {
  createWritable(): Promise<FileSystemWritableFileStream>;
}

interface SaveFilePickerOptions {
  suggestedName?: string;
  types?: { description: string; accept: Record<string, string[]> }[];
}

interface Window {
  showSaveFilePicker?(options?: SaveFilePickerOptions): Promise<FileSystemFileHandle>;
}
