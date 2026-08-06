"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, Button, Typography } from "@mui/material";
import { Upload } from "lucide-react";
import { toast } from "sonner";

import AppToolbar, { type PreviewLimit } from "@/components/AppToolbar";
import StatusBar from "@/components/StatusBar";
import RuleEditor from "@/components/RuleEditor";
import ExcelGrid from "@/components/ExcelGrid";
import AboutDialog from "@/components/AboutDialog";
import UploadDialog, { type ConvertResponse } from "@/components/UploadDialog";
import AddDescriptionDialog from "@/components/AddDescriptionDialog";
import LargeDatasetWarningDialog from "@/components/LargeDatasetWarningDialog";
import { exportRows, saveAs, downloadBase64File, type AddDescriptionResponse } from "@/lib/api";
import { generateDefaultFilename } from "@/lib/filename";
import { filterRows } from "@/lib/searchFilter";
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
const HIDE_LARGE_DATASET_WARNING_KEY = "excel-automation.hideLargeDatasetWarning.v1";
const DEFAULT_PREVIEW_LIMIT: PreviewLimit = 100;

export default function Home() {
  const [result, setResult] = useState<ConvertResponse | null>(null);
  const [descResult, setDescResult] = useState<AddDescriptionResponse | null>(null);
  const [rules, setRules] = useState<TransformationRule[]>([DEFAULT_RULE]);
  const [activeRuleId, setActiveRuleIdState] = useState(DEFAULT_RULE.id);
  const [draft, setDraft] = useState<TransformationRule>(() => normalizeForEditing(DEFAULT_RULE));

  const [uploadOpen, setUploadOpen] = useState(false);
  const [addDescriptionOpen, setAddDescriptionOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(true);
  // Hidden by default (V1.05: "simplify the interface for everyday users
  // while preserving advanced functionality") - loaded from localStorage
  // post-mount, same hydration-safety pattern as the rules below.
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [previewLimit, setPreviewLimit] = useState<PreviewLimit>(DEFAULT_PREVIEW_LIMIT);
  const [hideLargeDatasetWarning, setHideLargeDatasetWarning] = useState(false);
  const [largeDatasetWarningOpen, setLargeDatasetWarningOpen] = useState(false);
  const [saving, setSaving] = useState(false);
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
    setHideLargeDatasetWarning(window.localStorage.getItem(HIDE_LARGE_DATASET_WARNING_KEY) === "true");
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
      setDescResult(null); // a fresh conversion always discards any prior Add Description merge
      setSearchValue("");
      setPreviewLimit(DEFAULT_PREVIEW_LIMIT);
      showStatusMessage(`Converted ${data.summary.generated_rows} rows from ${data.summary.ppid_count} PPIDs`);
    },
    [showStatusMessage]
  );

  const handleDescriptionMerged = useCallback(
    (data: AddDescriptionResponse) => {
      setDescResult(data);
      showStatusMessage(`Description added - ${data.matched_count} matched, ${data.unmatched_count} unmatched`);
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

  // Rows to actually save/display always come from the description merge
  // once one exists, otherwise the plain conversion - Add Description never
  // mutates `result`, it layers on top of it (see AddDescriptionDialog).
  const activeRows = descResult ? descResult.rows : (result?.rows ?? []);

  const handlePreviewLimitRequest = useCallback(
    (value: PreviewLimit) => {
      if (value === "all" && !hideLargeDatasetWarning) {
        setLargeDatasetWarningOpen(true);
        return;
      }
      setPreviewLimit(value);
    },
    [hideLargeDatasetWarning]
  );

  const handleWarningContinue = useCallback((dontShowAgain: boolean) => {
    setPreviewLimit("all");
    setLargeDatasetWarningOpen(false);
    if (dontShowAgain) {
      window.localStorage.setItem(HIDE_LARGE_DATASET_WARNING_KEY, "true");
      setHideLargeDatasetWarning(true);
    }
  }, []);

  const handleWarningCancel = useCallback(() => {
    setLargeDatasetWarningOpen(false);
  }, []);

  const handleQuickSave = useCallback(async () => {
    if (!result || saving) return;
    setSaving(true);
    try {
      const filename = generateDefaultFilename();
      const data = await exportRows(filename, activeRows, draft);
      downloadBase64File(data.filename, data.file_base64);
      showStatusMessage(`Saved ${data.filename}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }, [result, saving, activeRows, draft, showStatusMessage]);

  const handleSaveAs = useCallback(async () => {
    if (!result || saving) return;
    setSaving(true);
    try {
      const filename = generateDefaultFilename();
      const data = await exportRows(filename, activeRows, draft);
      const outcome = await saveAs(data.filename, data.file_base64);
      if (outcome !== "cancelled") {
        showStatusMessage(`Saved ${data.filename}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }, [result, saving, activeRows, draft, showStatusMessage]);

  const displayColumns = resolveDisplayColumns(draft);
  const extraColumns = useMemo(() => (descResult ? [{ field: "DESC", header: "DESC" }] : []), [descResult]);
  const showRulePanel = showAdvanced && rulesOpen;

  // Search always runs against the full dataset so the match count is
  // accurate regardless of Preview Rows; only how many of those matches are
  // actually rendered is governed by Preview Rows (V1.06).
  const matchedRows = useMemo(() => filterRows(activeRows, searchValue), [activeRows, searchValue]);
  const isSearching = searchValue.trim().length > 0;
  const previewRows = useMemo(
    () => (previewLimit === "all" ? matchedRows : matchedRows.slice(0, previewLimit)),
    [matchedRows, previewLimit]
  );

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100vh", width: "100vw" }}>
      <AppToolbar
        onUploadClick={() => setUploadOpen(true)}
        onQuickSaveClick={handleQuickSave}
        onSaveAsClick={handleSaveAs}
        saveDisabled={!result || saving}
        rulesOpen={rulesOpen}
        onToggleRules={() => setRulesOpen((v) => !v)}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        showAdvanced={showAdvanced}
        onToggleAdvanced={handleToggleAdvanced}
        debugMode={debugMode}
        onToggleDebugMode={handleToggleDebugMode}
        onOpenAbout={() => setAboutOpen(true)}
        previewLimit={previewLimit}
        onPreviewLimitChange={handlePreviewLimitRequest}
        onAddDescriptionClick={() => setAddDescriptionOpen(true)}
        addDescriptionDisabled={!result}
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
            <ExcelGrid rows={previewRows} rule={draft} extraColumns={extraColumns} />
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
        columnCount={displayColumns.length + extraColumns.length}
        shownCount={previewRows.length}
        previewLimit={previewLimit}
        matchCount={isSearching ? matchedRows.length : undefined}
        currentRuleName={draft.rule_name}
        ppidCount={result?.summary.ppid_count}
        conversionTimeSeconds={result?.summary.conversion_time_seconds}
        debugPeakMemoryMb={debugMode ? result?.debug?.peak_memory_mb : undefined}
        debugEngineUsed={debugMode ? result?.debug?.engine_used : undefined}
        descriptionMatchedCount={descResult?.matched_count}
        descriptionUnmatchedCount={descResult?.unmatched_count}
        statusMessage={statusMessage}
      />

      <UploadDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onConverted={handleConverted}
        debugMode={debugMode}
      />
      <AddDescriptionDialog
        open={addDescriptionOpen}
        onClose={() => setAddDescriptionOpen(false)}
        baseRows={result?.rows ?? []}
        onMerged={handleDescriptionMerged}
      />
      <LargeDatasetWarningDialog
        open={largeDatasetWarningOpen}
        onCancel={handleWarningCancel}
        onContinue={handleWarningContinue}
      />
      <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </Box>
  );
}
