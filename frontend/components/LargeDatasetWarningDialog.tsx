"use client";

import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  FormControlLabel,
  Checkbox,
} from "@mui/material";

type Props = {
  open: boolean;
  onCancel: () => void;
  onContinue: (dontShowAgain: boolean) => void;
};

/** Confirmation shown when the user selects Preview Rows = All (V1.06) -
 * rendering/searching every row of a large dataset can be slow, so this
 * gives them a chance to back out before paying that cost. */
export default function LargeDatasetWarningDialog({ open, onCancel, onContinue }: Props) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleContinue = () => {
    onContinue(dontShowAgain);
    setDontShowAgain(false);
  };

  const handleCancel = () => {
    setDontShowAgain(false);
    onCancel();
  };

  return (
    <Dialog open={open} onClose={handleCancel} maxWidth="xs" fullWidth>
      <DialogTitle>Large Dataset Warning</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Displaying all rows may take longer to render and search for large datasets.
        </DialogContentText>
        <DialogContentText sx={{ mt: 1 }}>
          If you only need to verify the conversion, previewing 100-1000 rows is recommended.
        </DialogContentText>
        <FormControlLabel
          sx={{ mt: 1 }}
          control={
            <Checkbox
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              size="small"
            />
          }
          label="Don't show this warning again"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancel}>Cancel</Button>
        <Button variant="contained" onClick={handleContinue}>
          Continue
        </Button>
      </DialogActions>
    </Dialog>
  );
}
