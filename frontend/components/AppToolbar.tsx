"use client";

import { useState } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  InputBase,
  Box,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Switch,
  Divider,
} from "@mui/material";
import { Upload, Download, SlidersHorizontal, Search, Settings, Info } from "lucide-react";

type Props = {
  onUploadClick: () => void;
  onDownloadClick: () => void;
  downloadDisabled: boolean;
  rulesOpen: boolean;
  onToggleRules: () => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  showAdvanced: boolean;
  onToggleAdvanced: () => void;
  debugMode: boolean;
  onToggleDebugMode: () => void;
  onOpenAbout: () => void;
};

export default function AppToolbar({
  onUploadClick,
  onDownloadClick,
  downloadDisabled,
  rulesOpen,
  onToggleRules,
  searchValue,
  onSearchChange,
  showAdvanced,
  onToggleAdvanced,
  debugMode,
  onToggleDebugMode,
  onOpenAbout,
}: Props) {
  const [settingsAnchor, setSettingsAnchor] = useState<HTMLElement | null>(null);

  return (
    <AppBar position="static" color="default" elevation={0} sx={{ borderBottom: "1px solid #e0e0e0" }}>
      <Toolbar variant="dense" sx={{ gap: 1 }}>
        <Typography variant="subtitle1" sx={{ mr: 2, whiteSpace: "nowrap", fontWeight: 700 }}>
          Excel Automation
        </Typography>

        <Button size="small" startIcon={<Upload size={16} />} onClick={onUploadClick}>
          Upload
        </Button>
        <Button size="small" startIcon={<Download size={16} />} onClick={onDownloadClick} disabled={downloadDisabled}>
          Download
        </Button>
        {showAdvanced && (
          <Button
            size="small"
            startIcon={<SlidersHorizontal size={16} />}
            onClick={onToggleRules}
            variant={rulesOpen ? "contained" : "text"}
            disableElevation
          >
            Transformation Rules
          </Button>
        )}

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
          <IconButton size="small" onClick={(e) => setSettingsAnchor(e.currentTarget)}>
            <Settings size={18} />
          </IconButton>
        </Tooltip>
        <Menu anchorEl={settingsAnchor} open={!!settingsAnchor} onClose={() => setSettingsAnchor(null)}>
          <MenuItem onClick={onToggleAdvanced}>
            <ListItemIcon>
              <SlidersHorizontal size={16} />
            </ListItemIcon>
            <ListItemText primary="Show Advanced Features" secondary="Transformation Rule Editor" />
            <Switch edge="end" size="small" checked={showAdvanced} />
          </MenuItem>
          <MenuItem onClick={onToggleDebugMode}>
            <ListItemIcon>
              <Settings size={16} />
            </ListItemIcon>
            <ListItemText primary="Debug Mode" secondary="Timing, memory, engine diagnostics" />
            <Switch edge="end" size="small" checked={debugMode} />
          </MenuItem>
          <Divider />
          <MenuItem
            onClick={() => {
              setSettingsAnchor(null);
              onOpenAbout();
            }}
          >
            <ListItemIcon>
              <Info size={16} />
            </ListItemIcon>
            <ListItemText primary="About" />
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
}
