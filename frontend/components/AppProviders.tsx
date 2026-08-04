"use client";

import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import { Toaster } from "sonner";

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
      {children}
      <Toaster richColors position="top-right" />
    </ThemeProvider>
  );
}
