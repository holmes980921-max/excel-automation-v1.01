"use client";

import { useCallback, useRef, useState, type ClipboardEvent } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { Box, Button, Typography, TextField, Divider, IconButton, Tooltip } from "@mui/material";
import { FileSpreadsheet, UploadCloud, XCircle, ClipboardPaste, Play, CheckCircle2, X } from "lucide-react";
import { toast } from "sonner";
import { convertFile, convertText, type ConvertResponse } from "@/lib/api";
import { ACCEPTED_FILE_TYPES, describeRejection } from "@/lib/uploadValidation";
import { summarizePastedText, type PasteSummary } from "@/lib/pasteSummary";
import ProcessingOverlay from "@/components/ProcessingOverlay";
import AbortConfirmDialog from "@/components/AbortConfirmDialog";

// MUI's multiline TextField has no height cap by default and will size
// itself to fit every line of its value - fine for typed input, but a
// disaster if hundreds of thousands of pasted lines ever reached it (see
// handleTextPaste below, which makes sure they never do).
const PASTE_TEXTAREA_MAX_ROWS = 8;

type Props = {
  onConverted: (data: ConvertResponse) => void;
  debugMode: boolean;
};

/**
 * The application's starting point (V1.07) - replaces the old modal
 * UploadDialog. No "Upload" click is needed first: drag & drop, browse, or
 * paste directly here, then Convert. Selecting a file clears any pasted
 * text and vice versa, so there's always exactly one unambiguous input.
 */
export default function HomeScreen({ onConverted, debugMode }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState("");
  // Set only via handleTextPaste - the raw pasted text itself never enters
  // rendered state (see rawPasteTextRef), only its summary does.
  const [pasteSummary, setPasteSummary] = useState<PasteSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [abortConfirmOpen, setAbortConfirmOpen] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const rawPasteTextRef = useRef("");

  const onDrop = useCallback((accepted: File[], rejections: FileRejection[]) => {
    if (rejections.length > 0) {
      setError(describeRejection(rejections[0]));
      return;
    }
    if (accepted[0]) {
      setFile(accepted[0]);
      setPastedText("");
      setPasteSummary(null);
      rawPasteTextRef.current = "";
      setError(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive, isDragAccept, isDragReject } = useDropzone({
    onDrop,
    multiple: false,
    accept: ACCEPTED_FILE_TYPES,
    disabled: loading,
  });

  const handlePasteChange = (value: string) => {
    // Typed input only - actual paste events are intercepted below and
    // never reach here, so this never has to handle a huge string.
    setPastedText(value);
    if (value.trim()) setFile(null);
  };

  // Intercepts the paste event itself so pasted content never touches the
  // DOM/controlled textarea value, no matter how large - prevents the
  // large-dataset freeze at the source rather than reacting to it after
  // the fact. Parsing is a single fast pass (see lib/pasteSummary.ts); the
  // full text is kept only in a ref, and the UI collapses to a lightweight
  // summary instead of rendering it.
  const handleTextPaste = (e: ClipboardEvent<Element>) => {
    const text = e.clipboardData.getData("text");
    if (!text) return;
    e.preventDefault();
    rawPasteTextRef.current = text;
    setPasteSummary(summarizePastedText(text));
    setPastedText("");
    setFile(null);
    setError(null);
  };

  const handleClearPaste = () => {
    rawPasteTextRef.current = "";
    setPasteSummary(null);
    setPastedText("");
  };

  // V1.09: lets a user back out of an accidental upload before converting,
  // without needing to drop a replacement file or navigate away.
  const handleRemoveFile = () => {
    setFile(null);
    setError(null);
  };

  const handleConvert = async () => {
    if (loading) return; // belt-and-suspenders against a duplicate in-flight request
    const pasteText = pasteSummary ? rawPasteTextRef.current : pastedText;
    if (!file && !pasteText.trim()) return;

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setLoading(true);
    setError(null);
    try {
      const data = file
        ? await convertFile(file, debugMode, controller.signal)
        : await convertText(pasteText, debugMode, controller.signal);
      onConverted(data);
      setFile(null);
      setPastedText("");
      setPasteSummary(null);
      rawPasteTextRef.current = "";
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        // User-initiated cancel, not a failure - no error toast.
        return;
      }
      const message = err instanceof Error ? err.message : "Unexpected error during conversion.";
      setError(message);
      toast.error(message);
    } finally {
      abortControllerRef.current = null;
      setLoading(false);
    }
  };

  const handleAbortClick = () => setAbortConfirmOpen(true);

  const handleAbortConfirmed = () => {
    abortControllerRef.current?.abort();
    setAbortConfirmOpen(false);
  };

  const canConvert = !!file || !!pasteSummary || !!pastedText.trim();

  const dropzoneBorderColor = isDragReject ? "error.main" : isDragAccept ? "success.main" : "divider";
  const dropzoneBackground = isDragReject
    ? "rgba(211, 47, 47, 0.06)"
    : isDragAccept
      ? "rgba(46, 125, 50, 0.06)"
      : "transparent";

  return (
    <Box
      sx={{
        position: "relative",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        px: 3,
        py: 4,
      }}
    >
      <ProcessingOverlay
        open={loading}
        fileSizeMB={file ? file.size / (1024 * 1024) : undefined}
        onAbortClick={handleAbortClick}
      />

      <Box sx={{ width: "100%", maxWidth: 860 }}>
        <Typography variant="h4" align="center" sx={{ fontWeight: 700, mb: 2 }}>
          RCC Excel Automation
        </Typography>
        <Divider sx={{ mb: 4 }} />

        <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
          <Box sx={{ flex: "1 1 320px" }}>
            {file ? (
              // Matches the Paste panel's "Clipboard Loaded" card for
              // consistency (V1.09) - both give an explicit way to back
              // out of an accidental selection before converting.
              <Box
                sx={{
                  border: "2px dashed",
                  borderColor: "success.main",
                  borderRadius: 2,
                  background: "rgba(46, 125, 50, 0.06)",
                  p: 4,
                }}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, textAlign: "center" }}>
                  Upload
                </Typography>
                <Box sx={{ background: "#fff", borderRadius: 1, p: 2, textAlign: "left" }}>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                      <FileSpreadsheet size={16} color="#2e7d32" />
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        Selected File
                      </Typography>
                    </Box>
                    <Tooltip title="Remove">
                      <IconButton size="small" aria-label="Remove" onClick={handleRemoveFile} disabled={loading}>
                        <X size={14} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ wordBreak: "break-all" }}>
                    {file.name}
                  </Typography>
                </Box>
              </Box>
            ) : (
              <Box
                {...getRootProps()}
                sx={{
                  border: "2px dashed",
                  borderColor: dropzoneBorderColor,
                  borderRadius: 2,
                  p: 4,
                  textAlign: "center",
                  cursor: loading ? "default" : "pointer",
                  background: dropzoneBackground,
                  transition: "border-color 0.15s ease, background 0.15s ease",
                }}
              >
                <input {...getInputProps()} />
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                  Upload
                </Typography>
                <Box sx={{ display: "flex", justifyContent: "center", mb: 1, color: "text.secondary" }}>
                  {isDragReject ? <XCircle size={32} color="#d32f2f" /> : <UploadCloud size={32} />}
                </Box>
                <Typography color={isDragReject ? "error" : "text.secondary"} sx={{ mb: 0.5 }}>
                  {isDragReject
                    ? "This file type isn't supported"
                    : isDragActive
                      ? "Drop the file here"
                      : "Drag & Drop Excel"}
                </Typography>
                {!isDragReject && (
                  <Typography variant="caption" color="text.secondary">
                    or click to Browse File
                  </Typography>
                )}
              </Box>
            )}
          </Box>

          <Box
            sx={{
              flex: "1 1 320px",
              border: "2px dashed",
              borderColor: pastedText || pasteSummary ? "success.main" : "divider",
              borderRadius: 2,
              p: 4,
              textAlign: "center",
              background: pastedText || pasteSummary ? "rgba(46, 125, 50, 0.06)" : "transparent",
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              Paste
            </Typography>
            <Box sx={{ display: "flex", justifyContent: "center", mb: 1, color: "text.secondary" }}>
              <ClipboardPaste size={32} />
            </Box>
            {pasteSummary ? (
              // Large-dataset fix (V1.08): the raw pasted text never renders
              // here - only this lightweight summary does, regardless of
              // how many rows were pasted.
              <Box sx={{ background: "#fff", borderRadius: 1, p: 2, textAlign: "left" }}>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                    <CheckCircle2 size={16} color="#2e7d32" />
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      Clipboard Loaded
                    </Typography>
                  </Box>
                  <Tooltip title="Clear">
                    <IconButton size="small" aria-label="Clear" onClick={handleClearPaste} disabled={loading}>
                      <X size={14} />
                    </IconButton>
                  </Tooltip>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Rows: {pasteSummary.rows.toLocaleString()}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Columns: {pasteSummary.columns.toLocaleString()}
                </Typography>
                <Typography variant="body2" color="success.main" sx={{ mt: 0.5 }}>
                  Status: Ready to Convert
                </Typography>
              </Box>
            ) : (
              <TextField
                multiline
                minRows={4}
                maxRows={PASTE_TEXTAREA_MAX_ROWS}
                fullWidth
                disabled={loading}
                placeholder="Ctrl + V - Paste Excel Data"
                value={pastedText}
                onChange={(e) => handlePasteChange(e.target.value)}
                onPaste={handleTextPaste}
                sx={{ background: "#fff" }}
              />
            )}
          </Box>
        </Box>

        {error && (
          <Typography color="error" variant="body2" align="center" sx={{ mt: 2 }}>
            {error}
          </Typography>
        )}

        <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
          <Button
            variant="contained"
            size="large"
            startIcon={<Play size={18} />}
            disabled={!canConvert || loading}
            onClick={handleConvert}
          >
            Convert
          </Button>
        </Box>

        <Divider sx={{ my: 4 }} />

        <Box sx={{ display: "flex", justifyContent: "center", gap: 3 }}>
          <Typography variant="body2" color="text.secondary">
            Supported:
          </Typography>
          <Typography variant="body2" color="success.main">
            ✓ .xls
          </Typography>
          <Typography variant="body2" color="success.main">
            ✓ .xlsx
          </Typography>
          <Typography variant="body2" color="success.main">
            ✓ .xlsm
          </Typography>
        </Box>
      </Box>

      <AbortConfirmDialog
        open={abortConfirmOpen}
        onAbort={handleAbortConfirmed}
        onContinue={() => setAbortConfirmOpen(false)}
      />
    </Box>
  );
}
