"use client";

import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack, Typography, Divider } from "@mui/material";
import { FRONTEND_VERSION, GIT_TAG, BUILD_DATE, EDITION } from "@/lib/version";

type Props = {
  open: boolean;
  onClose: () => void;
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" sx={{ justifyContent: "space-between" }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {value}
      </Typography>
    </Stack>
  );
}

export default function AboutDialog({ open, onClose }: Props) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>About RCC Excel Automation</DialogTitle>
      <DialogContent>
        <Stack spacing={1}>
          <Row label="Application Name" value="RCC Excel Automation" />
          <Row label="Edition" value={EDITION} />
          <Row label="Version" value={FRONTEND_VERSION} />
          <Row label="Git Tag" value={GIT_TAG} />
          <Row label="Build Date" value={BUILD_DATE} />
          <Divider sx={{ my: 0.5 }} />
          <Row label="Runs entirely in your browser" value="No server, no upload" />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
