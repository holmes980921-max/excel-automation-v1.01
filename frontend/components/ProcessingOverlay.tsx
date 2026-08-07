"use client";

import { useEffect, useState } from "react";
import { Box, Typography, LinearProgress, Button } from "@mui/material";
import { XCircle } from "lucide-react";

const STAGES = [
  "Reading Excel",
  "Parsing Workbook",
  "Applying Transformation Rules",
  "Generating Output",
  "Preparing Preview",
];

// A single synchronous HTTP request has no real mid-flight progress signal
// (no streaming/WebSocket channel exists), so the stage text is a
// best-effort simulation and the progress bar is honestly indeterminate
// rather than claiming false precision - matches the spec's explicit
// "indeterminate when exact progress cannot be calculated" allowance.
const STAGE_INTERVAL_MS = 900;
const ELAPSED_TICK_MS = 100;
// Rough heuristic for the up-front estimate shown before processing starts:
// derived from the V1.05 benchmark (~300k rows / ~7MB read in a couple of
// seconds end-to-end) - deliberately conservative, "approximate values are
// acceptable" per spec.
const ESTIMATED_MB_PER_SECOND = 15;

type Props = {
  open: boolean;
  fileSizeMB?: number;
  /** V1.07: shows an Abort button while processing when provided - omit to
   * render the overlay with no way to cancel (e.g. Add Description, which
   * the spec scopes Abort out of - "Abort is only enabled while a
   * conversion is running"). */
  onAbortClick?: () => void;
};

export default function ProcessingOverlay({ open, fileSizeMB, onAbortClick }: Props) {
  const [stageIndex, setStageIndex] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (!open) {
      setStageIndex(0);
      setElapsedMs(0);
      return;
    }
    const startedAt = Date.now();
    const stageTimer = setInterval(() => {
      setStageIndex((i) => Math.min(i + 1, STAGES.length - 1));
    }, STAGE_INTERVAL_MS);
    const elapsedTimer = setInterval(() => {
      setElapsedMs(Date.now() - startedAt);
    }, ELAPSED_TICK_MS);
    return () => {
      clearInterval(stageTimer);
      clearInterval(elapsedTimer);
    };
  }, [open]);

  if (!open) return null;

  const estimatedSeconds = fileSizeMB ? Math.max(1, Math.round(fileSizeMB / ESTIMATED_MB_PER_SECOND)) : null;

  return (
    <Box
      sx={{
        position: "absolute",
        inset: 0,
        background: "rgba(255, 255, 255, 0.95)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 1.5,
        zIndex: 10,
        borderRadius: 1,
      }}
    >
      <Typography variant="h6" sx={{ fontWeight: 700 }}>
        Processing Excel File...
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center" }}>
        Please wait while your data is being processed.
        <br />
        Large files may take several seconds.
      </Typography>
      <Box sx={{ width: 260, mt: 1 }}>
        <LinearProgress />
      </Box>
      <Typography variant="caption" color="text.secondary">
        {STAGES[stageIndex]}
      </Typography>
      <Typography variant="caption" color="text.disabled">
        Elapsed: {(elapsedMs / 1000).toFixed(1)}s
        {estimatedSeconds !== null ? ` (estimated ~${estimatedSeconds}s)` : ""}
      </Typography>
      {onAbortClick && (
        <Button size="small" color="error" startIcon={<XCircle size={16} />} onClick={onAbortClick} sx={{ mt: 1 }}>
          Abort
        </Button>
      )}
    </Box>
  );
}
