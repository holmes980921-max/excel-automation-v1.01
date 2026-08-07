"use client";

import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import { Toaster } from "sonner";
import ErrorBoundary from "@/components/ErrorBoundary";

const theme = createTheme({
  palette: {
    mode: "light",
    background: { default: "#FDF8F0", paper: "#FFFFFF" },
    primary: { main: "#2563eb" },
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  },
  shape: { borderRadius: 8 },
});

export default function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ErrorBoundary>{children}</ErrorBoundary>
      {/* Bottom-right, and only ever used for errors/warnings (see StatusBar for
          success feedback) - guarantees the toolbar and search box are never covered. */}
      <Toaster richColors position="bottom-right" />
    </ThemeProvider>
  );
}
