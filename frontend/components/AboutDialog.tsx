"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack, Typography, Divider } from "@mui/material";
import { getBackendVersion } from "@/lib/api";
import { FRONTEND_VERSION, GIT_TAG, BUILD_DATE } from "@/lib/version";

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
  const [backendVersion, setBackendVersion] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    getBackendVersion().then(setBackendVersion);
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>About RCC Excel Automation</DialogTitle>
      <DialogContent>
        <Stack spacing={1}>
          <Row label="Application Name" value="RCC Excel Automation" />
          <Row label="Version" value={FRONTEND_VERSION} />
          <Row label="Git Tag" value={GIT_TAG} />
          <Row label="Build Date" value={BUILD_DATE} />
          <Divider sx={{ my: 0.5 }} />
          <Row label="Backend" value={`FastAPI${backendVersion ? ` (v${backendVersion})` : ""}`} />
          <Row label="Frontend" value="Next.js + React" />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
