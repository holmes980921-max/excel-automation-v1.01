"use client";

import { Box, Stack, Typography, Divider } from "@mui/material";

type Props = {
  totalRows: number;
  columnCount: number;
  filteredCount: number;
  currentRuleName: string;
  ppidCount?: number;
  conversionTimeSeconds?: number;
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
    </Box>
  );
}
