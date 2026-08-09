"use client";

import { useEffect, useState } from "react";
import { Box, Typography, CircularProgress, Link as MuiLink, Table, TableBody, TableCell, TableHead, TableRow } from "@mui/material";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { fetchDoc, type DocName } from "@/lib/docsLoader";

// Maps markdown elements to MUI components so fetched .md content matches
// the rest of the app's visual language (V1.11) instead of looking like
// unstyled raw HTML dropped into a dialog.
const components: Components = {
  h1: ({ children }) => (
    <Typography variant="h6" sx={{ fontWeight: 700, mt: 2, mb: 1 }}>
      {children}
    </Typography>
  ),
  h2: ({ children }) => (
    <Typography variant="subtitle1" sx={{ fontWeight: 700, mt: 3, mb: 1 }}>
      {children}
    </Typography>
  ),
  h3: ({ children }) => (
    <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 2, mb: 0.5 }}>
      {children}
    </Typography>
  ),
  p: ({ children }) => (
    <Typography variant="body2" sx={{ mb: 1.25 }}>
      {children}
    </Typography>
  ),
  li: ({ children }) => (
    <Typography component="li" variant="body2" sx={{ mb: 0.5 }}>
      {children}
    </Typography>
  ),
  a: ({ href, children }) => (
    <MuiLink href={href} target={href?.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">
      {children}
    </MuiLink>
  ),
  blockquote: ({ children }) => (
    <Box sx={{ borderLeft: "3px solid", borderColor: "primary.main", pl: 1.5, my: 1.5, color: "text.secondary" }}>
      {children}
    </Box>
  ),
  code: ({ children }) => (
    <Box component="code" sx={{ fontFamily: "monospace", fontSize: 13, background: "#f0f0f0", px: 0.5, borderRadius: 0.5 }}>
      {children}
    </Box>
  ),
  pre: ({ children }) => (
    <Box
      component="pre"
      sx={{ fontFamily: "monospace", fontSize: 12.5, background: "#f5f5f5", p: 1.5, borderRadius: 1, overflow: "auto" }}
    >
      {children}
    </Box>
  ),
  table: ({ children }) => (
    <Table size="small" sx={{ my: 1.5 }}>
      {children}
    </Table>
  ),
  thead: ({ children }) => <TableHead>{children}</TableHead>,
  tbody: ({ children }) => <TableBody>{children}</TableBody>,
  tr: ({ children }) => <TableRow>{children}</TableRow>,
  th: ({ children }) => (
    <TableCell sx={{ fontWeight: 700 }}>
      <Typography variant="body2" sx={{ fontWeight: 700 }}>
        {children}
      </Typography>
    </TableCell>
  ),
  td: ({ children }) => (
    <TableCell>
      <Typography variant="body2">{children}</Typography>
    </TableCell>
  ),
};

type Props = { doc: DocName };

/** Fetches and renders a Help & Support markdown document (V1.11) - the
 * content itself lives in public/docs/*.md, editable on GitHub without
 * touching any React/TypeScript. */
export default function MarkdownDoc({ doc }: Props) {
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setContent(null);
    setError(null);
    fetchDoc(doc)
      .then((text) => {
        if (!cancelled) setContent(text);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load this content.");
      });
    return () => {
      cancelled = true;
    };
  }, [doc]);

  if (error) {
    return (
      <Typography color="error" variant="body2">
        {error}
      </Typography>
    );
  }

  if (content === null) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  return (
    <Box sx={{ "& > *:first-of-type": { mt: 0 } }}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </Box>
  );
}
