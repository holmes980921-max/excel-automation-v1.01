"use client";

import { useCallback, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  TextField,
  Button,
  Box,
  Typography,
  CircularProgress,
} from "@mui/material";
import { FileSpreadsheet, UploadCloud, XCircle } from "lucide-react";
import { toast } from "sonner";
import { convertFile, convertText, type ConvertResponse } from "@/lib/api";

export type { ConvertResponse, ConversionSummary } from "@/lib/api";

const ACCEPTED_TYPES = {
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
  "application/vnd.ms-excel.sheet.macroEnabled.12": [".xlsm"],
  "application/vnd.ms-excel": [".xls"],
};

type Props = {
  open: boolean;
  onClose: () => void;
  onConverted: (data: ConvertResponse) => void;
};

type Mode = "file" | "paste";

function describeRejection(rejection: FileRejection): string {
  const code = rejection.errors[0]?.code;
  if (code === "file-invalid-type") {
    return `"${rejection.file.name}" isn't a supported file type. Please use .xls, .xlsx, or .xlsm.`;
  }
  if (code === "too-many-files") {
    return "Please drop a single file at a time.";
  }
  return rejection.errors[0]?.message ?? `"${rejection.file.name}" could not be used.`;
}

export default function UploadDialog({ open, onClose, onConverted }: Props) {
  const [mode, setMode] = useState<Mode>("file");
  const [file, setFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((accepted: File[], rejections: FileRejection[]) => {
    if (rejections.length > 0) {
      setError(describeRejection(rejections[0]));
      return;
    }
    if (accepted[0]) {
      setFile(accepted[0]);
      setError(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive, isDragAccept, isDragReject } = useDropzone({
    onDrop,
    multiple: false,
    accept: ACCEPTED_TYPES,
  });

  const handleConvert = async () => {
    if (mode === "file" && !file) return;
    if (mode === "paste" && !pastedText.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const data = mode === "file" ? await convertFile(file as File) : await convertText(pastedText);
      onConverted(data);
      setFile(null);
      setPastedText("");
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error during conversion.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const canConvert = mode === "file" ? !!file : !!pastedText.trim();

  const dropzoneBorderColor = isDragReject ? "error.main" : isDragAccept ? "success.main" : "divider";
  const dropzoneBackground = isDragReject
    ? "rgba(211, 47, 47, 0.06)"
    : isDragAccept
      ? "rgba(46, 125, 50, 0.06)"
      : "transparent";

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Upload Data</DialogTitle>
      <DialogContent>
        <Tabs value={mode} onChange={(_, v) => setMode(v)} sx={{ mb: 2 }}>
          <Tab label="File Upload" value="file" />
          <Tab label="Paste" value="paste" />
        </Tabs>

        {mode === "file" ? (
          <Box
            {...getRootProps()}
            sx={{
              border: "2px dashed",
              borderColor: dropzoneBorderColor,
              borderRadius: 2,
              p: 4,
              textAlign: "center",
              cursor: "pointer",
              background: dropzoneBackground,
              transition: "border-color 0.15s ease, background 0.15s ease",
            }}
          >
            <input {...getInputProps()} />
            <Box sx={{ display: "flex", justifyContent: "center", mb: 1, color: "text.secondary" }}>
              {isDragReject ? (
                <XCircle size={28} color="#d32f2f" />
              ) : file ? (
                <FileSpreadsheet size={28} color="#2e7d32" />
              ) : (
                <UploadCloud size={28} />
              )}
            </Box>
            <Typography color={isDragReject ? "error" : "text.secondary"}>
              {isDragReject
                ? "This file type isn't supported"
                : file
                  ? <strong>{file.name}</strong>
                  : isDragActive
                    ? "Drop the file here"
                    : "Drag & drop a .xls, .xlsx, or .xlsm file here, or click to choose one"}
            </Typography>
          </Box>
        ) : (
          <TextField
            multiline
            minRows={8}
            fullWidth
            placeholder="Copy a range from Excel (including the header row) and paste here (Ctrl+V)"
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
          />
        )}

        {error && (
          <Typography color="error" variant="body2" sx={{ mt: 2 }}>
            {error}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={!canConvert || loading} onClick={handleConvert}>
          {loading ? <CircularProgress size={18} sx={{ mr: 1 }} /> : null}
          Convert
        </Button>
      </DialogActions>
    </Dialog>
  );
}
