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
  Select,
} from "@mui/material";
import { Home, Save, FolderOutput, SlidersHorizontal, Search, Settings, Info, FileText } from "lucide-react";

export const PREVIEW_ROW_OPTIONS = [100, 500, 1000, 5000] as const;
export type PreviewLimit = (typeof PREVIEW_ROW_OPTIONS)[number] | "all";

type Props = {
  onHomeClick: () => void;
  hasResult: boolean;
  onQuickSaveClick: () => void;
  onSaveAsClick: () => void;
  saveDisabled: boolean;
  rulesOpen: boolean;
  onToggleRules: () => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  showAdvanced: boolean;
  onToggleAdvanced: () => void;
  debugMode: boolean;
  onToggleDebugMode: () => void;
  onOpenAbout: () => void;
  previewLimit: PreviewLimit;
  onPreviewLimitChange: (value: PreviewLimit) => void;
  onAddDescriptionClick: () => void;
  addDescriptionDisabled: boolean;
};

export default function AppToolbar({
  onHomeClick,
  hasResult,
  onQuickSaveClick,
  onSaveAsClick,
  saveDisabled,
  rulesOpen,
  onToggleRules,
  searchValue,
  onSearchChange,
  showAdvanced,
  onToggleAdvanced,
  debugMode,
  onToggleDebugMode,
  onOpenAbout,
  previewLimit,
  onPreviewLimitChange,
  onAddDescriptionClick,
  addDescriptionDisabled,
}: Props) {
  const [settingsAnchor, setSettingsAnchor] = useState<HTMLElement | null>(null);

  return (
    <AppBar position="static" color="default" elevation={0} sx={{ borderBottom: "1px solid #e0e0e0" }}>
      <Toolbar variant="dense" sx={{ gap: 1 }}>
        <Button size="small" startIcon={<Home size={16} />} onClick={onHomeClick}>
          Home
        </Button>
        <Typography variant="subtitle1" sx={{ mr: 2, whiteSpace: "nowrap", fontWeight: 700 }}>
          Excel Automation
        </Typography>

        {hasResult && (
          <>
            <Button size="small" startIcon={<Save size={16} />} onClick={onQuickSaveClick} disabled={saveDisabled}>
              Quick Save
            </Button>
            <Button
              size="small"
              startIcon={<FolderOutput size={16} />}
              onClick={onSaveAsClick}
              disabled={saveDisabled}
            >
              Save As
            </Button>
            <Button
              size="small"
              startIcon={<FileText size={16} />}
              onClick={onAddDescriptionClick}
              disabled={addDescriptionDisabled}
            >
              Add Description
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
          </>
        )}

        {hasResult && (
          <Box sx={{ display: "flex", alignItems: "center", ml: "auto", gap: 0.5 }}>
            <Typography variant="caption" sx={{ color: "text.secondary", whiteSpace: "nowrap" }}>
              Preview Rows
            </Typography>
            <Select
              size="small"
              value={String(previewLimit)}
              onChange={(e) => {
                const raw = e.target.value;
                onPreviewLimitChange(raw === "all" ? "all" : (Number(raw) as PreviewLimit));
              }}
              sx={{ fontSize: 14, minWidth: 90 }}
            >
              {PREVIEW_ROW_OPTIONS.map((n) => (
                <MenuItem key={n} value={String(n)}>
                  {n.toLocaleString()}
                </MenuItem>
              ))}
              <MenuItem value="all">All</MenuItem>
            </Select>
          </Box>
        )}

        {hasResult && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
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
        )}

        <Tooltip title="Settings">
          <IconButton
            size="small"
            onClick={(e) => setSettingsAnchor(e.currentTarget)}
            sx={hasResult ? undefined : { ml: "auto" }}
          >
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
