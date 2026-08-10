"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, IconButton, Box, Typography, CircularProgress } from "@mui/material";
import { X, AlertTriangle } from "lucide-react";
import { loadMaterialDb, type MaterialDbResult } from "@/lib/materialDb";
import { parseFilmMaterialValue } from "@/lib/filmMaterialParser";
import { pickContrastingTextColor } from "@/lib/cssColor";

const LAYER_WIDTH_PX = 220;
const LAYER_HEIGHT_PX = 48;
const MAX_STACK_HEIGHT_PX = 420;

type Props = {
  /** The raw filmmaterial cell value the user clicked, or null when the
   * dialog should be closed - there is no separate `open` prop, since
   * "which value is showing" and "is it open" are the same question. */
  value: string | null;
  onClose: () => void;
};

/**
 * Film Material Visualization (V1.12). Opens from a click on a
 * `filmmaterial` grid cell (see ExcelGrid.tsx) and shows the parsed
 * layer structure TOP -> BOTTOM, colored per frontend/public/data/
 * material-db.csv. Fully isolated from the conversion pipeline - a
 * missing/invalid Material DB disables *this dialog only* (shows an
 * error state instead of layers), never the Excel conversion workflow.
 */
export default function FilmMaterialVisualizationDialog({ value, onClose }: Props) {
  const [db, setDb] = useState<MaterialDbResult | null>(null);

  useEffect(() => {
    if (value === null) return;
    let cancelled = false;
    loadMaterialDb().then((result) => {
      if (!cancelled) setDb(result);
    });
    return () => {
      cancelled = true;
    };
  }, [value]);

  const open = value !== null;

  const renderBody = () => {
    if (db === null) {
      return (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress size={24} />
        </Box>
      );
    }

    if (db.status === "load-error") {
      return (
        <ErrorState
          title="Material Database Unavailable"
          lines={["Film Material Visualization is currently unavailable.", "Please contact the developer."]}
        />
      );
    }

    if (db.status === "invalid") {
      return <ErrorState title="Material Database Error" lines={[db.message]} />;
    }

    const parsed = parseFilmMaterialValue(value ?? "", db);
    if (parsed.status === "error") {
      return (
        <ErrorState
          title="Visualization unavailable"
          lines={[
            `Unknown Material: ${parsed.unknownMaterial}`,
            "Please update material-db.csv to include this Material Code.",
          ]}
        />
      );
    }

    return (
      <Box>
        <Typography variant="overline" sx={{ display: "block", textAlign: "center", fontWeight: 700, mb: 0.5 }}>
          TOP
        </Typography>
        <Box
          sx={{
            maxHeight: MAX_STACK_HEIGHT_PX,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {parsed.layers.map((code, index) => {
            const backgroundColor = db.entries.get(code) ?? "#cccccc";
            const textColor = pickContrastingTextColor(backgroundColor);
            return (
              <Box
                key={`${code}-${index}`}
                data-testid="film-material-layer"
                sx={{
                  width: LAYER_WIDTH_PX,
                  height: LAYER_HEIGHT_PX,
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid #000",
                  marginTop: index === 0 ? 0 : "-1px", // collapses adjacent borders into one line
                  backgroundColor,
                  color: textColor,
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                }}
              >
                {code}
              </Box>
            );
          })}
        </Box>
        <Typography variant="overline" sx={{ display: "block", textAlign: "center", fontWeight: 700, mt: 0.5 }}>
          BOTTOM
        </Typography>
      </Box>
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        Film Material Visualization
        <IconButton aria-label="close" size="small" onClick={onClose}>
          <X size={18} />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {value !== null && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, wordBreak: "break-all" }}>
            Source: {value}
          </Typography>
        )}
        {renderBody()}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

function ErrorState({ title, lines }: { title: string; lines: string[] }) {
  return (
    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, p: 1.5, background: "#fdecea", borderRadius: 1 }}>
      <AlertTriangle size={18} color="#d32f2f" style={{ flexShrink: 0, marginTop: 2 }} />
      <Box>
        <Typography variant="subtitle2" color="error" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        {lines.map((line) => (
          <Typography key={line} variant="body2" color="error">
            {line}
          </Typography>
        ))}
      </Box>
    </Box>
  );
}
