"use client";

import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box, Divider } from "@mui/material";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { formatErrorLog, type ErrorLogEntry } from "@/lib/errorLog";

type Props = {
  open: boolean;
  onClose: () => void;
  entry: ErrorLogEntry | null;
};

/**
 * Detailed error log, opened via "Show Log" from ErrorBoundary's friendly
 * error screen (V1.09 supportability). Plain text, easy to copy in full -
 * "Logs should help reproduce the issue" without needing any application
 * data (see lib/errorLog.ts - only technical/environment info goes in).
 */
export default function ErrorLogDialog({ open, onClose, entry }: Props) {
  if (!entry) return null;
  const logText = formatErrorLog(entry);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(logText);
      toast.success("Log copied to clipboard");
    } catch {
      toast.error("Could not copy automatically - please select and copy the log manually.");
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Error Log</DialogTitle>
      <DialogContent>
        <Box
          component="pre"
          sx={{
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            fontFamily: "monospace",
            fontSize: 12,
            background: "#f5f5f5",
            p: 2,
            borderRadius: 1,
            maxHeight: 320,
            overflow: "auto",
            m: 0,
          }}
        >
          {logText}
        </Box>
        <Divider sx={{ my: 2 }} />
        <Typography variant="body2" color="text.secondary">
          If you report this issue, please include the log above.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Developer Contact: jong10k.kim
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button variant="contained" startIcon={<Copy size={16} />} onClick={handleCopy}>
          Copy Log
        </Button>
      </DialogActions>
    </Dialog>
  );
}
