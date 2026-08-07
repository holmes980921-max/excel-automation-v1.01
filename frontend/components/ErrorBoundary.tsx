"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { Box, Typography, Button, Stack } from "@mui/material";
import { AlertTriangle } from "lucide-react";
import { buildErrorLogEntry, type ErrorLogEntry } from "@/lib/errorLog";
import ErrorLogDialog from "@/components/ErrorLogDialog";

type Props = { children: ReactNode };
type State = {
  hasError: boolean;
  error: Error | null;
  componentStack: string | null;
  showLog: boolean;
};

/**
 * Top-level React error boundary (V1.08 UI recovery, V1.09 Error Log Viewer).
 *
 * React error boundaries can only be class components - there is no hook
 * equivalent as of React 19. Catches an unexpected render-time error
 * anywhere in the tree and shows a recovery screen instead of a blank or
 * permanently broken page ("ensure the application remains usable after
 * failures"). Reloading the page (not just resetting local state) is the
 * recovery action: an error boundary's whole point is that the component
 * tree is in a state React itself gave up on, so resuming in-place isn't
 * guaranteed safe - a full reload is the one recovery path guaranteed not
 * to still be broken.
 *
 * "Show Log" (V1.09) surfaces the technical detail a bug report actually
 * needs (timestamp, version, error message/stack, environment) without
 * requiring the friendly top-level message to be cluttered with it.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, componentStack: null, showLog: false };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled UI error", error, info.componentStack);
    this.setState({ componentStack: info.componentStack ?? null });
  }

  handleReload = () => {
    window.location.assign("/");
  };

  handleShowLog = () => this.setState({ showLog: true });
  handleCloseLog = () => this.setState({ showLog: false });

  render() {
    if (!this.state.hasError) return this.props.children;

    const logEntry: ErrorLogEntry | null = this.state.error
      ? buildErrorLogEntry({
          error: this.state.error,
          operation: "UI Rendering",
          componentStack: this.state.componentStack,
        })
      : null;

    return (
      <Box
        sx={{
          height: "100vh",
          width: "100vw",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
          p: 3,
          textAlign: "center",
        }}
      >
        <AlertTriangle size={40} color="#d32f2f" />
        <Typography variant="h6">Something went wrong</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420 }}>
          An unexpected error occurred. Your in-progress session couldn&apos;t be recovered, but
          the application itself is fine - returning to Home starts a fresh session.
        </Typography>
        <Stack direction="row" spacing={1.5}>
          <Button variant="contained" onClick={this.handleReload}>
            Return to Home
          </Button>
          <Button variant="outlined" onClick={this.handleShowLog}>
            Show Log
          </Button>
        </Stack>
        <ErrorLogDialog open={this.state.showLog} onClose={this.handleCloseLog} entry={logEntry} />
      </Box>
    );
  }
}
