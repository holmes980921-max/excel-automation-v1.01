"use client";

import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from "@mui/material";

type Props = {
  open: boolean;
  onConfirmHome: () => void;
  onStay: () => void;
};

/** Confirms before discarding the active session (V1.07) - shown when the
 * Home button is clicked while a conversion result exists. */
export default function ReturnHomeDialog({ open, onConfirmHome, onStay }: Props) {
  return (
    <Dialog open={open} onClose={onStay} maxWidth="xs" fullWidth>
      <DialogTitle>Return to Home?</DialogTitle>
      <DialogContent>
        <DialogContentText>Current session will be discarded.</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onStay}>Stay</Button>
        <Button color="error" variant="contained" onClick={onConfirmHome}>
          Home
        </Button>
      </DialogActions>
    </Dialog>
  );
}
