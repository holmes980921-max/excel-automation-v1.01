"use client";

import { Box, Stack, Typography, Divider } from "@mui/material";
import { CheckCircle2, Circle } from "lucide-react";

type Props = {
  totalRows: number;
  columnCount: number;
  filteredCount: number;
  currentRuleName: string;
  ppidCount?: number;
  conversionTimeSeconds?: number;
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
  filteredCount,
  currentRuleName,
  ppidCount,
  conversionTimeSeconds,
  statusMessage,
}: Props) {
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
        <Stat label="Rows" value={totalRows} />
        <Stat label="Columns" value={columnCount} />
        <Stat label="Filtered" value={filteredCount} />
        <Stat label="Current Rule" value={currentRuleName} />
        {ppidCount !== undefined && <Stat label="PPIDs" value={ppidCount} />}
        {conversionTimeSeconds !== undefined && (
          <Stat label="Conversion Time" value={`${conversionTimeSeconds.toFixed(2)} sec`} />
        )}
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
