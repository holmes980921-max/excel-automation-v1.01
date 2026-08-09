"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Tabs,
  Tab,
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
  Divider,
} from "@mui/material";
import { ChevronDown, ShieldCheck } from "lucide-react";
import ReactMarkdown from "react-markdown";
import MarkdownDoc from "@/components/MarkdownDoc";
import { fetchDoc } from "@/lib/docsLoader";
import { parseFaq, type FaqEntry } from "@/lib/faqParser";

type Props = {
  open: boolean;
  onClose: () => void;
};

const TABS = ["User Guide", "FAQ", "Troubleshooting", "Error Details"] as const;

function FaqTab() {
  const [entries, setEntries] = useState<FaqEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDoc("FAQ")
      .then((text) => setEntries(parseFaq(text)))
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load the FAQ."));
  }, []);

  if (error) {
    return (
      <Typography color="error" variant="body2">
        {error}
      </Typography>
    );
  }
  if (entries === null) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  return (
    <Box>
      {entries.map((entry) => (
        <Accordion key={entry.question} disableGutters elevation={0} square>
          <AccordionSummary expandIcon={<ChevronDown size={18} />}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {entry.question}
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <ReactMarkdown
              components={{ p: ({ children }) => <Typography variant="body2">{children}</Typography> }}
            >
              {entry.answer}
            </ReactMarkdown>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
}

/**
 * Error Details is documentation *about* the diagnostic/Copy Log feature,
 * not a live log viewer - the live view is contextual, opened right where
 * an error actually happens (ErrorBoundary's "Show Log", or the "Show
 * Details" link next to a failed Convert/Add Description). Keeping this
 * tab as pure explanation avoids threading "last error" state through the
 * whole app just to duplicate what's already available at the point of
 * failure - see CODE_REVIEW_V1.11.md for the reasoning.
 */
function ErrorDetailsTab() {
  return (
    <Box>
      <Typography variant="body2" sx={{ mb: 1.5 }}>
        <strong>Error Details is not a developer Debug Mode.</strong> It&apos;s a diagnostic view
        that shows technical information about an error you encountered, so you can report it
        usefully.
      </Typography>
      <Typography variant="body2" sx={{ mb: 1.5 }}>
        When an error occurs, an <strong>Error Details</strong> (or <strong>Show Log</strong>)
        action appears next to the message. Opening it shows:
      </Typography>
      <Box component="ul" sx={{ pl: 3, mb: 1.5 }}>
        {["Timestamp", "Application version", "Error message", "Stack trace", "Browser information", "Operating system information"].map(
          (item) => (
            <Typography key={item} component="li" variant="body2">
              {item}
            </Typography>
          )
        )}
      </Box>
      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, mb: 1.5, p: 1.5, background: "#f0f7f0", borderRadius: 1 }}>
        <ShieldCheck size={18} color="#2e7d32" style={{ flexShrink: 0, marginTop: 2 }} />
        <Typography variant="body2">
          The log never includes your data - no PPID, TS#, DESC, Parameter/Reference values, or
          uploaded/pasted content. Only technical details useful for fixing the problem.
        </Typography>
      </Box>
      <Typography variant="body2" sx={{ mb: 1.5 }}>
        Click <strong>Copy Log</strong> to copy the full text, then send it to the developer along
        with a short description of what you were doing.
      </Typography>
      <Divider sx={{ my: 1.5 }} />
      <Typography variant="body2" color="text.secondary">
        Developer: <strong>jong10k.kim</strong>
      </Typography>
    </Box>
  );
}

/**
 * Help & Support (V1.11) - User Guide / FAQ / Troubleshooting / Error
 * Details, all reachable from one place. User Guide/FAQ/Troubleshooting
 * content is fetched from public/docs/*.md at runtime - editable directly
 * on GitHub without touching any React/TypeScript (see MarkdownDoc.tsx).
 */
export default function HelpSupportDialog({ open, onClose }: Props) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("User Guide");

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { height: "80vh" } } }}>
      <DialogTitle>Help & Support</DialogTitle>
      <Tabs
        value={tab}
        onChange={(_, value) => setTab(value)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ borderBottom: "1px solid #e0e0e0", minHeight: 40, px: 2 }}
      >
        {TABS.map((t) => (
          <Tab key={t} value={t} label={t} sx={{ minHeight: 40, textTransform: "none" }} />
        ))}
      </Tabs>
      <DialogContent dividers sx={{ flex: 1, overflow: "auto" }}>
        {tab === "User Guide" && <MarkdownDoc doc="USER_GUIDE" />}
        {tab === "FAQ" && <FaqTab />}
        {tab === "Troubleshooting" && <MarkdownDoc doc="TROUBLESHOOTING" />}
        {tab === "Error Details" && <ErrorDetailsTab />}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
