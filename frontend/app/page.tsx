"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Box, Button, Typography } from "@mui/material";
import { Upload } from "lucide-react";
import { toast } from "sonner";

import AppToolbar from "@/components/AppToolbar";
import StatusBar from "@/components/StatusBar";
import RuleEditor from "@/components/RuleEditor";
import ExcelGrid from "@/components/ExcelGrid";
import AboutDialog from "@/components/AboutDialog";
import UploadDialog, { type ConvertResponse } from "@/components/UploadDialog";
import { exportRows, downloadBase64File } from "@/lib/api";
import {
  DEFAULT_RULE,
  type TransformationRule,
  listRules,
  getActiveRuleId,
  setActiveRuleId as persistActiveRuleId,
  getRuleById,
  saveRule,
  updateRule,
  deleteRule,
  normalizeForEditing,
  resolveDisplayColumns,
} from "@/lib/rules";

const STATUS_MESSAGE_DURATION_MS = 4000;
const SHOW_ADVANCED_KEY = "excel-automation.showAdvanced.v1";
const DEBUG_MODE_KEY = "excel-automation.debugMode.v1";

export default function Home() {
  const [result, setResult] = useState<ConvertResponse | null>(null);
  const [rules, setRules] = useState<TransformationRule[]>([DEFAULT_RULE]);
  const [activeRuleId, setActiveRuleIdState] = useState(DEFAULT_RULE.id);
  const [draft, setDraft] = useState<TransformationRule>(() => normalizeForEditing(DEFAULT_RULE));

  const [uploadOpen, setUploadOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(true);
  // Hidden by default (V1.05: "simplify the interface for everyday users
  // while preserving advanced functionality") - loaded from localStorage
  // post-mount, same hydration-safety pattern as the rules below.
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [filteredCount, setFilteredCount] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const statusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Success feedback goes in the status bar, not a toast, so it never covers
  // the toolbar/search - toasts are reserved for errors and warnings.
  const showStatusMessage = useCallback((message: string) => {
    if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
    setStatusMessage(message);
    statusTimeoutRef.current = setTimeout(() => setStatusMessage(null), STATUS_MESSAGE_DURATION_MS);
  }, []);

  useEffect(() => () => {
    if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
  }, []);

  // Load persisted rules/preferences only on the client, after mount
  // (localStorage is unavailable during SSR) - avoids a hydration mismatch.
  useEffect(() => {
    const id = getActiveRuleId();
    setRules(listRules());
    setActiveRuleIdState(id);
    setDraft(normalizeForEditing(getRuleById(id)));
    setShowAdvanced(window.localStorage.getItem(SHOW_ADVANCED_KEY) === "true");
    setDebugMode(window.localStorage.getItem(DEBUG_MODE_KEY) === "true");
  }, []);

  const refreshRules = useCallback(() => setRules(listRules()), []);

  const handleToggleAdvanced = useCallback(() => {
    setShowAdvanced((prev) => {
      const next = !prev;
      window.localStorage.setItem(SHOW_ADVANCED_KEY, String(next));
      return next;
    });
  }, []);

  const handleToggleDebugMode = useCallback(() => {
    setDebugMode((prev) => {
      const next = !prev;
      window.localStorage.setItem(DEBUG_MODE_KEY, String(next));
      return next;
    });
  }, []);

  const handleConverted = useCallback(
    (data: ConvertResponse) => {
      setResult(data);
      showStatusMessage(`Converted ${data.summary.generated_rows} rows from ${data.summary.ppid_count} PPIDs`);
    },
    [showStatusMessage]
  );

  const handleSelectRule = useCallback((id: string) => {
    setActiveRuleIdState(id);
    persistActiveRuleId(id);
    setDraft(normalizeForEditing(getRuleById(id)));
  }, []);

  const handleSaveAsNew = useCallback(() => {
    const saved = saveRule({
      rule_name: draft.rule_name || "Untitled Rule",
      output_columns: draft.output_columns,
      column_order: draft.column_order,
      aliases: draft.aliases,
    });
    refreshRules();
    setActiveRuleIdState(saved.id);
    persistActiveRuleId(saved.id);
    setDraft(normalizeForEditing(saved));
    showStatusMessage(`Saved rule "${saved.rule_name}"`);
  }, [draft, refreshRules, showStatusMessage]);

  const handleUpdateCurrent = useCallback(() => {
    if (activeRuleId === DEFAULT_RULE.id) return;
    const updated = updateRule({ ...draft, id: activeRuleId });
    refreshRules();
    setDraft(normalizeForEditing(updated));
    showStatusMessage(`Updated rule "${updated.rule_name}"`);
  }, [activeRuleId, draft, refreshRules, showStatusMessage]);

  const handleDeleteCurrent = useCallback(() => {
    if (activeRuleId === DEFAULT_RULE.id) return;
    const name = draft.rule_name;
    deleteRule(activeRuleId);
    refreshRules();
    setActiveRuleIdState(DEFAULT_RULE.id);
    persistActiveRuleId(DEFAULT_RULE.id);
    setDraft(normalizeForEditing(DEFAULT_RULE));
    showStatusMessage(`Deleted rule "${name}"`);
  }, [activeRuleId, draft.rule_name, refreshRules, showStatusMessage]);

  const handleResetToDefault = useCallback(() => {
    setActiveRuleIdState(DEFAULT_RULE.id);
    persistActiveRuleId(DEFAULT_RULE.id);
    setDraft(normalizeForEditing(DEFAULT_RULE));
    showStatusMessage("Reset to Default");
  }, [showStatusMessage]);

  const handleDownload = useCallback(async () => {
    if (!result) return;
    setDownloading(true);
    try {
      const data = await exportRows(result.filename, result.rows, draft);
      downloadBase64File(data.filename, data.file_base64);
      showStatusMessage(`Downloaded ${data.filename}`);
    } catch (err) {
      // Errors stay as toasts - they need to interrupt and be acknowledged.
      toast.error(err instanceof Error ? err.message : "Export failed");
    } finally {
      setDownloading(false);
    }
  }, [result, draft, showStatusMessage]);

  const displayColumns = resolveDisplayColumns(draft);
  const showRulePanel = showAdvanced && rulesOpen;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100vh", width: "100vw" }}>
      <AppToolbar
        onUploadClick={() => setUploadOpen(true)}
        onDownloadClick={handleDownload}
        downloadDisabled={!result || downloading}
        rulesOpen={rulesOpen}
        onToggleRules={() => setRulesOpen((v) => !v)}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        showAdvanced={showAdvanced}
        onToggleAdvanced={handleToggleAdvanced}
        debugMode={debugMode}
        onToggleDebugMode={handleToggleDebugMode}
        onOpenAbout={() => setAboutOpen(true)}
      />

      <Box sx={{ display: "flex", flex: 1, minHeight: 0 }}>
        {showRulePanel && (
          <Box sx={{ width: 340, flexShrink: 0, borderRight: "1px solid #e0e0e0", background: "#fff" }}>
            <RuleEditor
              draft={draft}
              onDraftChange={setDraft}
              rules={rules}
              activeRuleId={activeRuleId}
              onSelectRule={handleSelectRule}
              onSaveAsNew={handleSaveAsNew}
              onUpdateCurrent={handleUpdateCurrent}
              onDeleteCurrent={handleDeleteCurrent}
              onResetToDefault={handleResetToDefault}
              onStatusMessage={showStatusMessage}
            />
          </Box>
        )}

        <Box sx={{ flex: 1, minWidth: 0, p: 1.5, background: "#FDF8F0" }}>
          {result ? (
            <ExcelGrid
              rows={result.rows}
              rule={draft}
              quickFilterText={searchValue}
              onDisplayedRowCountChange={setFilteredCount}
            />
          ) : (
            <Box
              sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
                color: "text.secondary",
              }}
            >
              <Typography variant="h6">No data yet</Typography>
              <Typography variant="body2">Upload an excel file or paste data to get started.</Typography>
              <Button variant="contained" startIcon={<Upload size={16} />} onClick={() => setUploadOpen(true)}>
                Upload File
              </Button>
            </Box>
          )}
        </Box>
      </Box>

      <StatusBar
        totalRows={result?.total_rows ?? 0}
        columnCount={displayColumns.length}
        filteredCount={result ? filteredCount : 0}
        currentRuleName={draft.rule_name}
        ppidCount={result?.summary.ppid_count}
        conversionTimeSeconds={result?.summary.conversion_time_seconds}
        debugPeakMemoryMb={debugMode ? result?.debug?.peak_memory_mb : undefined}
        debugEngineUsed={debugMode ? result?.debug?.engine_used : undefined}
        statusMessage={statusMessage}
      />

      <UploadDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onConverted={handleConverted}
        debugMode={debugMode}
      />
      <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </Box>
  );
}
