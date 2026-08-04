"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
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
import { toast } from "sonner";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

export type ConversionSummary = {
  ppid_count: number;
  ts_count: number;
  generated_rows: number;
  conversion_time_seconds: number;
};

export type ConvertResponse = {
  filename: string;
  columns: string[];
  rows: Record<string, unknown>[];
  total_rows: number;
  file_base64: string;
  summary: ConversionSummary;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onConverted: (data: ConvertResponse) => void;
};

type Mode = "file" | "paste";

export default function UploadDialog({ open, onClose, onConverted }: Props) {
  const [mode, setMode] = useState<Mode>("file");
  const [file, setFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) {
      setFile(accepted[0]);
      setError(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel.sheet.macroEnabled.12": [".xlsm"],
    },
  });

  const handleConvert = async () => {
    if (mode === "file" && !file) return;
    if (mode === "paste" && !pastedText.trim()) return;

    setLoading(true);
    setError(null);
    try {
      let res: Response;
      if (mode === "file") {
        const formData = new FormData();
        formData.append("file", file as File);
        res = await fetch(`${API_BASE}/api/convert`, { method: "POST", body: formData });
      } else {
        res = await fetch(`${API_BASE}/api/convert-text`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: pastedText }),
        });
      }

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail ?? `Conversion failed (${res.status})`);
      }

      const data: ConvertResponse = await res.json();
      toast.success(`Converted ${data.summary.generated_rows} rows from ${data.summary.ppid_count} PPIDs`);
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
              borderColor: isDragActive ? "primary.main" : "divider",
              borderRadius: 2,
              p: 4,
              textAlign: "center",
              cursor: "pointer",
              background: isDragActive ? "action.hover" : "transparent",
            }}
          >
            <input {...getInputProps()} />
            <Typography color="text.secondary">
              {file ? <strong>{file.name}</strong> : "Drag & drop an .xlsx file here, or click to choose one"}
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
