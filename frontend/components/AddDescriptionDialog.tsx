"use client";

import { useCallback, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  Tooltip,
} from "@mui/material";
import { FileSpreadsheet, UploadCloud, XCircle, X } from "lucide-react";
import { toast } from "sonner";
import { addDescription, type AddDescriptionResponse } from "@/lib/api";
import { ACCEPTED_FILE_TYPES, describeRejection } from "@/lib/uploadValidation";
import ProcessingOverlay from "@/components/ProcessingOverlay";

type Props = {
  open: boolean;
  onClose: () => void;
  /** The original converted rows (never a previously-merged result) - Add
   * Description always merges onto this base set so re-running with a
   * different description file never stacks DESC values. */
  baseRows: Record<string, unknown>[];
  onMerged: (data: AddDescriptionResponse) => void;
};

export default function AddDescriptionDialog({ open, onClose, baseRows, onMerged }: Props) {
  const [file, setFile] = useState<File | null>(null);
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
    accept: ACCEPTED_FILE_TYPES,
    disabled: loading,
  });

  const handleMerge = async () => {
    if (loading || !file) return;
    setLoading(true);
    setError(null);
    try {
      const data = await addDescription(file, baseRows);
      onMerged(data);
      setFile(null);
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error while adding description.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    setFile(null);
    setError(null);
    onClose();
  };

  // V1.09: matches the Home screen's Selected File / Remove pattern for
  // consistency - lets the user back out of an accidental selection here
  // too, without closing and reopening the dialog.
  const handleRemoveFile = () => {
    setFile(null);
    setError(null);
  };

  const dropzoneBorderColor = isDragReject ? "error.main" : isDragAccept ? "success.main" : "divider";
  const dropzoneBackground = isDragReject
    ? "rgba(211, 47, 47, 0.06)"
    : isDragAccept
      ? "rgba(46, 125, 50, 0.06)"
      : "transparent";

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add Description</DialogTitle>
      <DialogContent sx={{ position: "relative" }}>
        <ProcessingOverlay open={loading} fileSizeMB={file ? file.size / (1024 * 1024) : undefined} />

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Upload a Description file with PPID and DESC columns. DESC is added to every converted row whose
          PPID matches - rows with no match are left as is.
        </Typography>

        {file ? (
          <Box
            sx={{
              border: "2px dashed",
              borderColor: "success.main",
              borderRadius: 2,
              background: "rgba(46, 125, 50, 0.06)",
              p: 3,
            }}
          >
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
            <Box sx={{ display: "flex", justifyContent: "center", mb: 1, color: "text.secondary" }}>
              {isDragReject ? <XCircle size={28} color="#d32f2f" /> : <UploadCloud size={28} />}
            </Box>
            <Typography color={isDragReject ? "error" : "text.secondary"}>
              {isDragReject
                ? "This file type isn't supported"
                : isDragActive
                  ? "Drop the file here"
                  : "Drag & drop a .xls, .xlsx, or .xlsm file here, or click to choose one"}
            </Typography>
          </Box>
        )}

        {error && (
          <Typography color="error" variant="body2" sx={{ mt: 2 }}>
            {error}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button variant="contained" disabled={!file || loading} onClick={handleMerge}>
          Add Description
        </Button>
      </DialogActions>
    </Dialog>
  );
}
