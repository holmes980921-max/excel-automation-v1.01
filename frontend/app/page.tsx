"use client";

import { useCallback, useEffect, useState } from "react";
import { Box, Button, Typography } from "@mui/material";
import { Upload } from "lucide-react";
import { toast } from "sonner";

import AppToolbar from "@/components/AppToolbar";
import StatusBar from "@/components/StatusBar";
import RuleEditor from "@/components/RuleEditor";
import ExcelGrid from "@/components/ExcelGrid";
import UploadDialog, { type ConvertResponse } from "@/components/UploadDialog";
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

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

function base64ToBlob(base64: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export default function Home() {
  const [result, setResult] = useState<ConvertResponse | null>(null);
  const [rules, setRules] = useState<TransformationRule[]>([DEFAULT_RULE]);
  const [activeRuleId, setActiveRuleIdState] = useState(DEFAULT_RULE.id);
  const [draft, setDraft] = useState<TransformationRule>(() => normalizeForEditing(DEFAULT_RULE));

  const [uploadOpen, setUploadOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(true);
  const [searchValue, setSearchValue] = useState("");
  const [filteredCount, setFilteredCount] = useState(0);
  const [downloading, setDownloading] = useState(false);

  // Load persisted rules only on the client, after mount (localStorage is unavailable
  // during SSR) - avoids a hydration mismatch on first paint.
  useEffect(() => {
    const id = getActiveRuleId();
    setRules(listRules());
    setActiveRuleIdState(id);
    setDraft(normalizeForEditing(getRuleById(id)));
  }, []);

  const refreshRules = useCallback(() => setRules(listRules()), []);

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
    toast.success(`Saved rule "${saved.rule_name}"`);
  }, [draft, refreshRules]);

  const handleUpdateCurrent = useCallback(() => {
    if (activeRuleId === DEFAULT_RULE.id) return;
    const updated = updateRule({ ...draft, id: activeRuleId });
    refreshRules();
    setDraft(normalizeForEditing(updated));
    toast.success(`Updated rule "${updated.rule_name}"`);
  }, [activeRuleId, draft, refreshRules]);

  const handleDeleteCurrent = useCallback(() => {
    if (activeRuleId === DEFAULT_RULE.id) return;
    const name = draft.rule_name;
    deleteRule(activeRuleId);
    refreshRules();
    setActiveRuleIdState(DEFAULT_RULE.id);
    persistActiveRuleId(DEFAULT_RULE.id);
    setDraft(normalizeForEditing(DEFAULT_RULE));
    toast.success(`Deleted rule "${name}"`);
  }, [activeRuleId, draft.rule_name, refreshRules]);

  const handleResetToDefault = useCallback(() => {
    setActiveRuleIdState(DEFAULT_RULE.id);
    persistActiveRuleId(DEFAULT_RULE.id);
    setDraft(normalizeForEditing(DEFAULT_RULE));
    toast.success("Reset to Default");
  }, []);

  const handleDownload = useCallback(async () => {
    if (!result) return;
    setDownloading(true);
    try {
      const res = await fetch(`${API_BASE}/api/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: result.filename, rows: result.rows, rule: draft }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail ?? `Export failed (${res.status})`);
      }
      const data = await res.json();
      const blob = base64ToBlob(data.file_base64);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = data.filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${data.filename}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    } finally {
      setDownloading(false);
    }
  }, [result, draft]);

  const displayColumns = resolveDisplayColumns(draft);

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
      />

      <Box sx={{ display: "flex", flex: 1, minHeight: 0 }}>
        {rulesOpen && (
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
      />

      <UploadDialog open={uploadOpen} onClose={() => setUploadOpen(false)} onConverted={setResult} />
    </Box>
  );
}
