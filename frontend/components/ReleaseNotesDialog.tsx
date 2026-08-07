"use client";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Box,
  Chip,
} from "@mui/material";
import { ChevronDown } from "lucide-react";
import { RELEASE_NOTES, type ReleaseNote } from "@/lib/releaseNotes";

type Props = {
  open: boolean;
  onClose: () => void;
};

function Section({ label, color, items }: { label: string; color: "success" | "info" | "warning"; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <Box sx={{ mb: 1.5 }}>
      <Chip label={label} color={color} size="small" variant="outlined" sx={{ mb: 0.75 }} />
      <Box component="ul" sx={{ m: 0, pl: 3 }}>
        {items.map((item) => (
          <Typography key={item} component="li" variant="body2" color="text.secondary">
            {item}
          </Typography>
        ))}
      </Box>
    </Box>
  );
}

/**
 * Release Notes tab (V1.09) - "the primary in-app location for
 * communicating updates." Most recent version expanded by default; every
 * entry shows New/Improved/Fixed/Known Issues, matching the spec's
 * required structure. See lib/releaseNotes.ts - future versions only need
 * to add one entry there.
 */
export default function ReleaseNotesDialog({ open, onClose }: Props) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Release Notes</DialogTitle>
      <DialogContent dividers sx={{ p: 0 }}>
        {RELEASE_NOTES.map((note: ReleaseNote, index) => (
          <Accordion key={note.version} defaultExpanded={index === 0} disableGutters elevation={0} square>
            <AccordionSummary expandIcon={<ChevronDown size={18} />}>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {note.version} - {note.title}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {note.date}
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Section label="New" color="success" items={note.new} />
              <Section label="Improved" color="info" items={note.improved} />
              <Section label="Fixed" color="warning" items={note.fixed} />
              <Section label="Known Issues" color="warning" items={note.knownIssues} />
            </AccordionDetails>
          </Accordion>
        ))}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
