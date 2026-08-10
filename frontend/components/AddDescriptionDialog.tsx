"use client";

import { useRef, useState, type ClipboardEvent } from "react";
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
import { ClipboardPaste, CheckCircle2, X } from "lucide-react";
import { toast } from "sonner";
import { addDescriptionFromClipboard, ApiError, type AddDescriptionResponse } from "@/lib/api";
import { summarizePastedText, type PasteSummary } from "@/lib/pasteSummary";
import { buildErrorLogEntry, toError, type ErrorLogEntry } from "@/lib/errorLog";
import ProcessingOverlay from "@/components/ProcessingOverlay";
import ErrorLogDialog from "@/components/ErrorLogDialog";

const PASTE_TEXTAREA_MAX_ROWS = 6;

// V1.13 follow-up: Clipboard Paste is the only supported way to provide a
// Description lookup - shown as a light, subdued placeholder (disappears on
// paste/typing, never becomes part of the actual data) rather than a
// separate permanent UI block, matching Conversion Input's placeholder
// pattern on the Home screen.
const PASTE_PLACEHOLDER = `PPID    |    DESC
PPID1   |    DESC1
PPID2   |    DESC2
PPID3   |    DESC3`;

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
 * V1.13 follow-up: Clipboard Paste is the only supported way to provide a
 * Description lookup - Upload and Drag & Drop were removed (not just
 * hidden), matching Conversion Input's V1.13 standardization on the Home
 * screen. Paste mirrors HomeScreen's pattern exactly (intercept the paste
 * event so pasted content never renders raw, show a lightweight summary
 * instead).
 */
export default function AddDescriptionDialog({ open, onClose, baseRows, onMerged }: Props) {
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

  const handlePasteChange = (value: string) => {
    setPastedText(value);
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
    if (loading || !hasPaste) return;
    setLoading(true);
    setError(null);
    setErrorLogEntry(null);
    try {
      const data = await addDescriptionFromClipboard({ text: pasteText, html: rawPasteHtmlRef.current }, baseRows);
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

  const canMerge = !!pasteSummary || !!pastedText.trim();

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add Description</DialogTitle>
      <DialogContent sx={{ position: "relative" }}>
        <ProcessingOverlay open={loading} />

        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Provide a Description lookup with PPID and DESC columns. Paste the data directly from
          Excel. DESC is added to every converted row whose PPID matches; rows with no match are
          left as is.
        </Typography>

        <Box
          sx={{
            border: "2px dashed",
            borderColor: pastedText || pasteSummary ? "success.main" : "divider",
            borderRadius: 2,
            p: 2,
            textAlign: "center",
            background: pastedText || pasteSummary ? "rgba(46, 125, 50, 0.06)" : "transparent",
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
                minRows={3}
                maxRows={PASTE_TEXTAREA_MAX_ROWS}
                fullWidth
                size="small"
                disabled={loading}
                placeholder={PASTE_PLACEHOLDER}
                value={pastedText}
                onChange={(e) => handlePasteChange(e.target.value)}
                onPaste={handleTextPaste}
                sx={{
                  background: "#fff",
                  "& .MuiInputBase-input::placeholder": {
                    color: "text.disabled",
                    opacity: 1,
                  },
                }}
              />
            </>
          )}
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
