"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { Box, Typography, Button } from "@mui/material";
import { AlertTriangle } from "lucide-react";

type Props = { children: ReactNode };
type State = { hasError: boolean };

/**
 * Top-level React error boundary (V1.08 UI recovery).
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
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled UI error", error, info.componentStack);
  }

  handleReload = () => {
    window.location.assign("/");
  };

  render() {
    if (!this.state.hasError) return this.props.children;

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
        <Button variant="contained" onClick={this.handleReload}>
          Return to Home
        </Button>
      </Box>
    );
  }
}
