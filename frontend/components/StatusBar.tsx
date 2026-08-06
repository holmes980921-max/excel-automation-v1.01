"use client";

import { Box, Stack, Typography, Divider } from "@mui/material";
import { CheckCircle2, Circle } from "lucide-react";
import type { PreviewLimit } from "@/components/AppToolbar";

type Props = {
  totalRows: number;
  columnCount: number;
  /** Rows actually rendered after search + Preview Rows slicing (V1.06). */
  shownCount: number;
  previewLimit: PreviewLimit;
  /** Present only while a search query is active - total matches across the
   * full dataset, independent of the Preview Rows slice. */
  matchCount?: number;
  currentRuleName: string;
  ppidCount?: number;
  conversionTimeSeconds?: number;
  /** Only populated when Debug Mode is on (see Settings menu) - never shown otherwise. */
  debugPeakMemoryMb?: number;
  debugEngineUsed?: string;
  /** Present only after a successful Add Description merge (V1.06). */
  descriptionMatchedCount?: number;
  descriptionUnmatchedCount?: number;
  /** Transient success feedback (e.g. "Saved rule ..."). Errors/warnings use
   * toasts instead - see AppProviders' <Toaster />. */
  statusMessage?: string | null;
};

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Typography variant="caption" sx={{ color: "text.secondary" }}>
      {label} : <strong style={{ color: "inherit" }}>{value}</strong>
    </Typography>
  );
}

export default function StatusBar({
  totalRows,
  columnCount,
  shownCount,
  previewLimit,
  matchCount,
  currentRuleName,
  ppidCount,
  conversionTimeSeconds,
  debugPeakMemoryMb,
  debugEngineUsed,
  descriptionMatchedCount,
  descriptionUnmatchedCount,
  statusMessage,
}: Props) {
  const isSearching = matchCount !== undefined;
  const rowsSummary = isSearching
    ? `${matchCount!.toLocaleString()} matches - Showing ${previewLimit === "all" ? "all" : `first ${shownCount.toLocaleString()}`} rows`
    : `Showing ${shownCount.toLocaleString()} of ${totalRows.toLocaleString()} rows`;

  return (
    <Box
      sx={{
        borderTop: "1px solid #e0e0e0",
        background: "#F5F5F5",
        px: 2,
        py: 0.5,
        display: "flex",
        alignItems: "center",
        minHeight: 28,
      }}
    >
      <Stack direction="row" spacing={2} divider={<Divider orientation="vertical" flexItem />}>
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          <strong style={{ color: "inherit" }}>{rowsSummary}</strong>
        </Typography>
        <Stat label="Columns" value={columnCount} />
        <Stat label="Current Rule" value={currentRuleName} />
        {ppidCount !== undefined && <Stat label="PPIDs" value={ppidCount} />}
        {conversionTimeSeconds !== undefined && (
          <Stat label="Conversion Time" value={`${conversionTimeSeconds.toFixed(2)} sec`} />
        )}
        {descriptionMatchedCount !== undefined && (
          <Stat label="Description Matched PPIDs" value={descriptionMatchedCount} />
        )}
        {descriptionUnmatchedCount !== undefined && (
          <Stat label="Description Unmatched PPIDs" value={descriptionUnmatchedCount} />
        )}
        {debugPeakMemoryMb !== undefined && <Stat label="Peak Memory" value={`${debugPeakMemoryMb.toFixed(1)} MB`} />}
        {debugEngineUsed !== undefined && <Stat label="Engine" value={debugEngineUsed} />}
      </Stack>

      {/* Always shows something here: the transient success message while
       * one is active, otherwise a neutral "Ready" idle state - so the bar
       * visibly settles rather than going blank (which read as stuck/frozen). */}
      <Box
        sx={{
          ml: "auto",
          display: "flex",
          alignItems: "center",
          gap: 0.5,
          color: statusMessage ? "success.main" : "text.disabled",
          transition: "color 0.2s ease",
        }}
      >
        {statusMessage ? <CheckCircle2 size={14} /> : <Circle size={8} fill="currentColor" />}
        <Typography variant="caption">{statusMessage ?? "Ready"}</Typography>
      </Box>
    </Box>
  );
}
