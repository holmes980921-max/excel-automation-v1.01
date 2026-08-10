"use client";

import { useRef, useState, type ClipboardEvent } from "react";
import { Box, Button, Typography, TextField, Divider, IconButton, Tooltip } from "@mui/material";
import { ClipboardPaste, Play, CheckCircle2, X } from "lucide-react";
import { toast } from "sonner";
import { convertText, ApiError, type ConvertResponse } from "@/lib/api";
import { summarizePastedText, type PasteSummary } from "@/lib/pasteSummary";
import { buildErrorLogEntry, toError, type ErrorLogEntry } from "@/lib/errorLog";
import ProcessingOverlay from "@/components/ProcessingOverlay";
import AbortConfirmDialog from "@/components/AbortConfirmDialog";
import ErrorLogDialog from "@/components/ErrorLogDialog";

// MUI's multiline TextField has no height cap by default and will size
// itself to fit every line of its value - fine for typed input, but a
// disaster if hundreds of thousands of pasted lines ever reached it (see
// handleTextPaste below, which makes sure they never do).
const PASTE_TEXTAREA_MAX_ROWS = 10;

// V1.13: Clipboard Paste is the only supported Conversion Input method -
// "All Export to Excel" and "EXPORT_ALL_TABLE_%%.xls" are RCC's own product
// names and must not be reworded. Shown both as this placeholder (inside
// the empty input) and as the page-level numbered guide below, so the
// instructions are visible whether or not the user has scrolled to/focused
// the input yet.
const PASTE_PLACEHOLDER = `Paste RCC data here

1. Save the RCC Excel file using "All Export to Excel".
2. Open the file "EXPORT_ALL_TABLE_%%.xls".
3. Press Ctrl+A, then Ctrl+C.
4. Paste the data here and click Convert.`;

const GUIDE_STEPS = [
  'Save the RCC Excel file using "All Export to Excel".',
  'Open the file "EXPORT_ALL_TABLE_%%.xls".',
  "Press Ctrl+A, then Ctrl+C.",
  "Paste the data into the web application and click Convert.",
];

type Props = {
  onConverted: (data: ConvertResponse) => void;
  debugMode: boolean;
};

/**
 * The application's starting point (V1.07). V1.13: Clipboard Paste is the
 * only supported Conversion Input method - File Upload and Drag & Drop
 * were removed (not just hidden) to standardize the workflow around
 * RCC's actual "All Export to Excel" -> copy -> paste process and avoid
 * encouraging a file-selection path that no longer exists. Add
 * Description (a separate dialog) is unaffected - it still supports
 * Upload/Drag & Drop/Paste, per V1.13's own scope.
 */
export default function HomeScreen({ onConverted, debugMode }: Props) {
  const [pastedText, setPastedText] = useState("");
  // Set only via handleTextPaste - the raw pasted text itself never enters
  // rendered state (see rawPasteTextRef), only its summary does.
  const [pasteSummary, setPasteSummary] = useState<PasteSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // V1.11: lets a user see full diagnostic detail (and Copy Log) for a
  // failed conversion, not just full-page crashes - reuses the same
  // ErrorLogDialog/errorLog.ts infrastructure ErrorBoundary's "Show Log"
  // already uses.
  const [errorLogEntry, setErrorLogEntry] = useState<ErrorLogEntry | null>(null);
  const [showErrorLog, setShowErrorLog] = useState(false);
  const [abortConfirmOpen, setAbortConfirmOpen] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const rawPasteTextRef = useRef("");

  const handlePasteChange = (value: string) => {
    // Typed input only - actual paste events are intercepted below and
    // never reach here, so this never has to handle a huge string.
    setPastedText(value);
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
    setError(null);
  };

  const handleClearPaste = () => {
    rawPasteTextRef.current = "";
    setPasteSummary(null);
    setPastedText("");
  };

  const handleConvert = async () => {
    if (loading) return; // belt-and-suspenders against a duplicate in-flight request
    const pasteText = pasteSummary ? rawPasteTextRef.current : pastedText;
    if (!pasteText.trim()) return;

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setLoading(true);
    setError(null);
    setErrorLogEntry(null);
    try {
      const data = await convertText(pasteText, debugMode, controller.signal);
      onConverted(data);
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
      // V1.11: not offered for a known validation failure - its message may
      // already echo back the user's own data (see lib/api.ts's ApiError).
      if (!(err instanceof ApiError && err.isValidationError)) {
        setErrorLogEntry(buildErrorLogEntry({ error: toError(err, message), operation: "Conversion" }));
      }
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

  const canConvert = !!pasteSummary || !!pastedText.trim();

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
        overflowY: "auto",
      }}
    >
      <ProcessingOverlay open={loading} onAbortClick={handleAbortClick} />

      <Box sx={{ width: "100%", maxWidth: 620 }}>
        <Typography variant="h4" align="center" sx={{ fontWeight: 700, mb: 2 }}>
          RCC Excel Automation
        </Typography>
        <Divider sx={{ mb: 3 }} />

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, textAlign: "center" }}>
            How to get your data
          </Typography>
          <Box component="ol" sx={{ m: 0, pl: 3 }}>
            {GUIDE_STEPS.map((step) => (
              <Typography key={step} component="li" variant="body2" color="text.secondary" sx={{ mb: 0.25 }}>
                {step}
              </Typography>
            ))}
          </Box>
        </Box>

        <Box
          sx={{
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
              minRows={5}
              maxRows={PASTE_TEXTAREA_MAX_ROWS}
              fullWidth
              disabled={loading}
              placeholder={PASTE_PLACEHOLDER}
              value={pastedText}
              onChange={(e) => handlePasteChange(e.target.value)}
              onPaste={handleTextPaste}
              sx={{
                background: "#fff",
                // The placeholder is deliberately light/subdued (spec:
                // "visually subdued/light text color") - MUI's default
                // placeholder opacity already does this, this just pins
                // the exact shade rather than relying on the theme default.
                "& .MuiInputBase-input::placeholder": {
                  color: "text.disabled",
                  opacity: 1,
                },
              }}
            />
          )}
        </Box>

        {error && (
          <Box sx={{ textAlign: "center", mt: 2 }}>
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
      </Box>

      <AbortConfirmDialog
        open={abortConfirmOpen}
        onAbort={handleAbortConfirmed}
        onContinue={() => setAbortConfirmOpen(false)}
      />
      <ErrorLogDialog open={showErrorLog} onClose={() => setShowErrorLog(false)} entry={errorLogEntry} />
    </Box>
  );
}
