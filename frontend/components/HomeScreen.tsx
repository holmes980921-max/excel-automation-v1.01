"use client";

import { useCallback, useRef, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { Box, Button, Typography, TextField, Divider } from "@mui/material";
import { FileSpreadsheet, UploadCloud, XCircle, ClipboardPaste, Play } from "lucide-react";
import { toast } from "sonner";
import { convertFile, convertText, type ConvertResponse } from "@/lib/api";
import { ACCEPTED_FILE_TYPES, describeRejection } from "@/lib/uploadValidation";
import ProcessingOverlay from "@/components/ProcessingOverlay";
import AbortConfirmDialog from "@/components/AbortConfirmDialog";

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [abortConfirmOpen, setAbortConfirmOpen] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const onDrop = useCallback((accepted: File[], rejections: FileRejection[]) => {
    if (rejections.length > 0) {
      setError(describeRejection(rejections[0]));
      return;
    }
    if (accepted[0]) {
      setFile(accepted[0]);
      setPastedText("");
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
    setPastedText(value);
    if (value.trim()) setFile(null);
  };

  const handleConvert = async () => {
    if (loading) return; // belt-and-suspenders against a duplicate in-flight request
    if (!file && !pastedText.trim()) return;

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setLoading(true);
    setError(null);
    try {
      const data = file
        ? await convertFile(file, debugMode, controller.signal)
        : await convertText(pastedText, debugMode, controller.signal);
      onConverted(data);
      setFile(null);
      setPastedText("");
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

  const canConvert = !!file || !!pastedText.trim();

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
          Excel Automation
        </Typography>
        <Divider sx={{ mb: 4 }} />

        <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
          <Box
            {...getRootProps()}
            sx={{
              flex: "1 1 320px",
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
              {isDragReject ? (
                <XCircle size={32} color="#d32f2f" />
              ) : file ? (
                <FileSpreadsheet size={32} color="#2e7d32" />
              ) : (
                <UploadCloud size={32} />
              )}
            </Box>
            <Typography color={isDragReject ? "error" : "text.secondary"} sx={{ mb: 0.5 }}>
              {isDragReject
                ? "This file type isn't supported"
                : file
                  ? <strong>{file.name}</strong>
                  : isDragActive
                    ? "Drop the file here"
                    : "Drag & Drop Excel"}
            </Typography>
            {!file && !isDragReject && (
              <Typography variant="caption" color="text.secondary">
                or click to Browse File
              </Typography>
            )}
          </Box>

          <Box
            sx={{
              flex: "1 1 320px",
              border: "2px dashed",
              borderColor: pastedText ? "success.main" : "divider",
              borderRadius: 2,
              p: 4,
              textAlign: "center",
              background: pastedText ? "rgba(46, 125, 50, 0.06)" : "transparent",
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              Paste
            </Typography>
            <Box sx={{ display: "flex", justifyContent: "center", mb: 1, color: "text.secondary" }}>
              <ClipboardPaste size={32} />
            </Box>
            <TextField
              multiline
              minRows={4}
              fullWidth
              disabled={loading}
              placeholder="Ctrl + V - Paste Excel Data"
              value={pastedText}
              onChange={(e) => handlePasteChange(e.target.value)}
              sx={{ background: "#fff" }}
            />
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
