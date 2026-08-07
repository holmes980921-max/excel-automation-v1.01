"use client";

import { Box, Chip } from "@mui/material";
import { CheckCircle2 } from "lucide-react";

type Props = {
  converted: boolean;
  descriptionApplied: boolean;
  readyToSave: boolean;
};

/** Quick at-a-glance workflow status (V1.07) - "users should always know
 * current status/next action/current workflow stage." Only rendered once
 * there's something to report (see app/page.tsx - hidden on the Home
 * screen, since nothing has happened yet). */
export default function WorkflowBadges({ converted, descriptionApplied, readyToSave }: Props) {
  if (!converted && !descriptionApplied && !readyToSave) return null;

  return (
    <Box
      sx={{
        display: "flex",
        gap: 1,
        px: 2,
        py: 0.75,
        borderBottom: "1px solid #e0e0e0",
        background: "#fff",
      }}
    >
      {converted && (
        <Chip
          size="small"
          variant="outlined"
          color="success"
          icon={<CheckCircle2 size={14} />}
          label="Converted"
        />
      )}
      {descriptionApplied && (
        <Chip
          size="small"
          variant="outlined"
          color="success"
          icon={<CheckCircle2 size={14} />}
          label="Description Applied"
        />
      )}
      {readyToSave && (
        <Chip
          size="small"
          variant="outlined"
          color="success"
          icon={<CheckCircle2 size={14} />}
          label="Ready to Save"
        />
      )}
    </Box>
  );
}
