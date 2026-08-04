"use client";

import { AppBar, Toolbar, Typography, Button, IconButton, InputBase, Box, Tooltip } from "@mui/material";
import { Upload, Download, SlidersHorizontal, Search, Settings } from "lucide-react";

type Props = {
  onUploadClick: () => void;
  onDownloadClick: () => void;
  downloadDisabled: boolean;
  rulesOpen: boolean;
  onToggleRules: () => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
};

export default function AppToolbar({
  onUploadClick,
  onDownloadClick,
  downloadDisabled,
  rulesOpen,
  onToggleRules,
  searchValue,
  onSearchChange,
}: Props) {
  return (
    <AppBar position="static" color="default" elevation={0} sx={{ borderBottom: "1px solid #e0e0e0" }}>
      <Toolbar variant="dense" sx={{ gap: 1 }}>
        <Typography variant="subtitle1" sx={{ mr: 2, whiteSpace: "nowrap", fontWeight: 700 }}>
          Excel Automation V1.03
        </Typography>

        <Button size="small" startIcon={<Upload size={16} />} onClick={onUploadClick}>
          Upload
        </Button>
        <Button size="small" startIcon={<Download size={16} />} onClick={onDownloadClick} disabled={downloadDisabled}>
          Download
        </Button>
        <Button
          size="small"
          startIcon={<SlidersHorizontal size={16} />}
          onClick={onToggleRules}
          variant={rulesOpen ? "contained" : "text"}
          disableElevation
        >
          Transformation Rules
        </Button>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            ml: "auto",
            border: "1px solid #d0d0d0",
            borderRadius: 1,
            px: 1,
            background: "#fff",
          }}
        >
          <Search size={14} color="#888" />
          <InputBase
            placeholder="Search..."
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            sx={{ ml: 1, fontSize: 14, width: 200 }}
          />
        </Box>

        <Tooltip title="Settings">
          <IconButton size="small">
            <Settings size={18} />
          </IconButton>
        </Tooltip>
      </Toolbar>
    </AppBar>
  );
}
