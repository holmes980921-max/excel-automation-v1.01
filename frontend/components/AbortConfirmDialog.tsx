"use client";

import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from "@mui/material";

type Props = {
  open: boolean;
  onAbort: () => void;
  onContinue: () => void;
};

/** Confirms before actually cancelling an in-flight conversion (V1.07) -
 * pressing Abort in ProcessingOverlay opens this rather than cancelling
 * immediately, since the discarded work can't be recovered. */
export default function AbortConfirmDialog({ open, onAbort, onContinue }: Props) {
  return (
    <Dialog open={open} onClose={onContinue} maxWidth="xs" fullWidth>
      <DialogTitle>Abort current conversion?</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Current conversion will stop. Unfinished results will be discarded.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onContinue}>Continue</Button>
        <Button color="error" variant="contained" onClick={onAbort}>
          Abort
        </Button>
      </DialogActions>
    </Dialog>
  );
}
