"use client";

import { useCallback, useRef, useState, type ClipboardEvent } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  IconButton,
  Tooltip,
} from "@mui/material";
import { FileSpreadsheet, UploadCloud, XCircle, ClipboardPaste, CheckCircle2, X } from "lucide-react";
import { toast } from "sonner";
import { addDescription, addDescriptionFromClipboard, ApiError, type AddDescriptionResponse } from "@/lib/api";
import { ACCEPTED_FILE_TYPES, describeRejection } from "@/lib/uploadValidation";
import { summarizePastedText, type PasteSummary } from "@/lib/pasteSummary";
import { buildErrorLogEntry, toError, type ErrorLogEntry } from "@/lib/errorLog";
import ProcessingOverlay from "@/components/ProcessingOverlay";
import ErrorLogDialog from "@/components/ErrorLogDialog";

const PASTE_TEXTAREA_MAX_ROWS = 6;

type Props = {
  open: boolean;
  onClose: () => void;
  /** The original converted rows (never a previously-merged result) - Add
   * Description always merges onto this base set so re-running with a
   * different description file never stacks DESC values. */
  baseRows: Record<string, unknown>[];
  onMerged: (data: AddDescriptionResponse) => void;
};

/**
 * V1.10: supports all three input methods (Upload, Drag & Drop, Clipboard
 * Paste) for a Description lookup - V1.09 only had Upload/Drag & Drop.
 * Paste mirrors HomeScreen's pattern exactly (intercept the paste event so
 * pasted content never renders raw, show a lightweight summary instead),
 * and all three methods funnel through the same normalization + merge
 * pipeline in `converter/engine.ts`, so results are identical regardless
 * of how the data got in.
 */
export default function AddDescriptionDialog({ open, onClose, baseRows, onMerged }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [pasteSummary, setPasteSummary] = useState<PasteSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // V1.11: same "Show Details" affordance as HomeScreen - reuses the
  // existing ErrorLogDialog/errorLog.ts infrastructure.
  const [errorLogEntry, setErrorLogEntry] = useState<ErrorLogEntry | null>(null);
  const [showErrorLog, setShowErrorLog] = useState(false);
  const rawPasteTextRef = useRef("");
  const rawPasteHtmlRef = useRef<string | undefined>(undefined);

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
      rawPasteHtmlRef.current = undefined;
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

  // Same large-paste-safe interception pattern as HomeScreen (V1.08): the
  // raw pasted text/html never touches rendered state, only a summary does.
  const handleTextPaste = (e: ClipboardEvent<Element>) => {
    const text = e.clipboardData.getData("text/plain");
    const html = e.clipboardData.getData("text/html");
    if (!text && !html) return;
    e.preventDefault();
    rawPasteTextRef.current = text;
    rawPasteHtmlRef.current = html || undefined;
    setPasteSummary(summarizePastedText(text || html));
    setPastedText("");
    setFile(null);
    setError(null);
  };

  const handleClearPaste = () => {
    rawPasteTextRef.current = "";
    rawPasteHtmlRef.current = undefined;
    setPasteSummary(null);
    setPastedText("");
  };

  const handleMerge = async () => {
    const pasteText = pasteSummary ? rawPasteTextRef.current : pastedText;
    const hasPaste = !!pasteText.trim() || !!rawPasteHtmlRef.current;
    if (loading || (!file && !hasPaste)) return;
    setLoading(true);
    setError(null);
    setErrorLogEntry(null);
    try {
      const data = file
        ? await addDescription(file, baseRows)
        : await addDescriptionFromClipboard({ text: pasteText, html: rawPasteHtmlRef.current }, baseRows);
      onMerged(data);
      resetInputs();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error while adding description.";
      setError(message);
      // V1.11: not offered for a known validation failure (e.g. a
      // duplicate-PPID list), which may echo back the user's own data -
      // see lib/api.ts's ApiError.
      if (!(err instanceof ApiError && err.isValidationError)) {
        setErrorLogEntry(buildErrorLogEntry({ error: toError(err, message), operation: "Add Description" }));
      }
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const resetInputs = () => {
    setFile(null);
    setPastedText("");
    setPasteSummary(null);
    rawPasteTextRef.current = "";
    rawPasteHtmlRef.current = undefined;
  };

  const handleClose = () => {
    if (loading) return;
    resetInputs();
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

  const canMerge = !!file || !!pasteSummary || !!pastedText.trim();

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add Description</DialogTitle>
      <DialogContent sx={{ position: "relative" }}>
        <ProcessingOverlay open={loading} fileSizeMB={file ? file.size / (1024 * 1024) : undefined} />

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Provide a Description lookup with PPID and DESC columns - upload a file, drag & drop, or paste
          directly from Excel. DESC is added to every converted row whose PPID matches - rows with no
          match are left as is.
        </Typography>

        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
          <Box sx={{ flex: "1 1 220px" }}>
            {file ? (
              <Box
                sx={{
                  border: "2px dashed",
                  borderColor: "success.main",
                  borderRadius: 2,
                  background: "rgba(46, 125, 50, 0.06)",
                  p: 2,
                  height: "100%",
                }}
              >
                <Box sx={{ background: "#fff", borderRadius: 1, p: 1.5, textAlign: "left" }}>
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
                  p: 2,
                  textAlign: "center",
                  cursor: loading ? "default" : "pointer",
                  background: dropzoneBackground,
                  transition: "border-color 0.15s ease, background 0.15s ease",
                  height: "100%",
                }}
              >
                <input {...getInputProps()} />
                <Box sx={{ display: "flex", justifyContent: "center", mb: 1, color: "text.secondary" }}>
                  {isDragReject ? <XCircle size={26} color="#d32f2f" /> : <UploadCloud size={26} />}
                </Box>
                <Typography variant="body2" color={isDragReject ? "error" : "text.secondary"}>
                  {isDragReject
                    ? "This file type isn't supported"
                    : isDragActive
                      ? "Drop the file here"
                      : "Drag & drop, or click to choose a .xls/.xlsx/.xlsm file"}
                </Typography>
              </Box>
            )}
          </Box>

          <Box sx={{ flex: "1 1 220px" }}>
            <Box
              sx={{
                border: "2px dashed",
                borderColor: pastedText || pasteSummary ? "success.main" : "divider",
                borderRadius: 2,
                p: 2,
                textAlign: "center",
                background: pastedText || pasteSummary ? "rgba(46, 125, 50, 0.06)" : "transparent",
                height: "100%",
              }}
            >
              {pasteSummary ? (
                <Box sx={{ background: "#fff", borderRadius: 1, p: 1.5, textAlign: "left" }}>
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
                </Box>
              ) : (
                <>
                  <Box sx={{ display: "flex", justifyContent: "center", mb: 1, color: "text.secondary" }}>
                    <ClipboardPaste size={26} />
                  </Box>
                  <TextField
                    multiline
                    minRows={2}
                    maxRows={PASTE_TEXTAREA_MAX_ROWS}
                    fullWidth
                    size="small"
                    disabled={loading}
                    placeholder="Ctrl + V - Paste PPID/DESC data"
                    value={pastedText}
                    onChange={(e) => handlePasteChange(e.target.value)}
                    onPaste={handleTextPaste}
                    sx={{ background: "#fff" }}
                  />
                </>
              )}
            </Box>
          </Box>
        </Box>

        {error && (
          <Box sx={{ mt: 2 }}>
            <Typography color="error" variant="body2" component="span">
              {error}
            </Typography>
            {errorLogEntry && (
              <Button size="small" onClick={() => setShowErrorLog(true)} sx={{ ml: 1, textTransform: "none" }}>
                Show Details
              </Button>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button variant="contained" disabled={!canMerge || loading} onClick={handleMerge}>
          Add Description
        </Button>
      </DialogActions>
      <ErrorLogDialog open={showErrorLog} onClose={() => setShowErrorLog(false)} entry={errorLogEntry} />
    </Dialog>
  );
}
