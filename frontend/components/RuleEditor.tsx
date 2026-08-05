"use client";

import { useRef, useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Save, Trash2, RotateCcw, Download, Upload, Plus } from "lucide-react";
import {
  Box,
  Stack,
  TextField,
  Checkbox,
  Select,
  MenuItem,
  Button,
  IconButton,
  Typography,
  Divider,
} from "@mui/material";
import { toast } from "sonner";
import {
  type TransformationRule,
  DEFAULT_RULE,
  exportRuleJson,
  importRuleFromJson,
} from "@/lib/rules";

type Props = {
  draft: TransformationRule;
  onDraftChange: (rule: TransformationRule) => void;
  rules: TransformationRule[];
  activeRuleId: string;
  onSelectRule: (id: string) => void;
  onSaveAsNew: () => void;
  onUpdateCurrent: () => void;
  onDeleteCurrent: () => void;
  onResetToDefault: () => void;
  /** Success feedback goes here (status bar), not a toast - toasts are for errors/warnings only. */
  onStatusMessage: (message: string) => void;
};

function SortableRow({
  field,
  enabled,
  alias,
  onToggle,
  onAliasChange,
}: {
  field: string;
  enabled: boolean;
  alias: string;
  onToggle: () => void;
  onAliasChange: (value: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Box
      ref={setNodeRef}
      style={style}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        py: 0.5,
        px: 0.5,
        borderRadius: 1,
        "&:hover": { background: "rgba(0,0,0,0.03)" },
      }}
    >
      <Box {...attributes} {...listeners} sx={{ cursor: "grab", display: "flex", color: "text.secondary" }}>
        <GripVertical size={16} />
      </Box>
      <Checkbox size="small" checked={enabled} onChange={onToggle} sx={{ p: 0.5 }} />
      <Typography variant="body2" sx={{ width: 140, flexShrink: 0 }} noWrap title={field}>
        {field}
      </Typography>
      <TextField
        size="small"
        variant="standard"
        placeholder="Alias (optional)"
        value={alias}
        onChange={(e) => onAliasChange(e.target.value)}
        fullWidth
      />
    </Box>
  );
}

export default function RuleEditor({
  draft,
  onDraftChange,
  rules,
  activeRuleId,
  onSelectRule,
  onSaveAsNew,
  onUpdateCurrent,
  onDeleteCurrent,
  onResetToDefault,
  onStatusMessage,
}: Props) {
  const [newRuleName, setNewRuleName] = useState("");
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const toggleColumn = (field: string) => {
    const enabled = new Set(draft.output_columns);
    if (enabled.has(field)) enabled.delete(field);
    else enabled.add(field);
    onDraftChange({ ...draft, output_columns: draft.column_order.filter((c) => enabled.has(c)) });
  };

  const setAlias = (field: string, value: string) => {
    const aliases = { ...draft.aliases };
    if (value.trim()) aliases[field] = value;
    else delete aliases[field];
    onDraftChange({ ...draft, aliases });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = draft.column_order.indexOf(String(active.id));
    const newIndex = draft.column_order.indexOf(String(over.id));
    onDraftChange({ ...draft, column_order: arrayMove(draft.column_order, oldIndex, newIndex) });
  };

  const handleExport = () => {
    const blob = new Blob([exportRuleJson(draft)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${draft.rule_name || "rule"}.json`;
    a.click();
    URL.revokeObjectURL(url);
    onStatusMessage(`Exported "${draft.rule_name}"`);
  };

  const handleImportFile = async (file: File) => {
    try {
      const text = await file.text();
      const imported = importRuleFromJson(text);
      onDraftChange({ ...draft, ...imported });
      onStatusMessage(`Imported "${imported.rule_name}" - review and Save to keep it`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid rule JSON");
    }
  };

  const enabledSet = new Set(draft.output_columns);
  const isDefault = activeRuleId === DEFAULT_RULE.id;

  return (
    <Stack spacing={1.5} sx={{ p: 2, height: "100%", overflowY: "auto" }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
        Transformation Rules
      </Typography>

      <Select
        size="small"
        value={activeRuleId}
        onChange={(e) => onSelectRule(e.target.value)}
        fullWidth
      >
        {rules.map((r) => (
          <MenuItem key={r.id} value={r.id}>
            {r.rule_name}
          </MenuItem>
        ))}
      </Select>

      <TextField
        size="small"
        label="Rule name"
        value={draft.rule_name}
        onChange={(e) => onDraftChange({ ...draft, rule_name: e.target.value })}
        fullWidth
      />

      <Divider />

      <Typography variant="caption" color="text.secondary">
        Drag to reorder · check to include · edit to alias
      </Typography>

      <DndContext
        id="rule-editor-column-order"
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={draft.column_order} strategy={verticalListSortingStrategy}>
          <Stack spacing={0}>
            {draft.column_order.map((field) => (
              <SortableRow
                key={field}
                field={field}
                enabled={enabledSet.has(field)}
                alias={draft.aliases[field] ?? ""}
                onToggle={() => toggleColumn(field)}
                onAliasChange={(v) => setAlias(field, v)}
              />
            ))}
          </Stack>
        </SortableContext>
      </DndContext>

      <Divider />

      <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
        <Button size="small" startIcon={<RotateCcw size={14} />} onClick={onResetToDefault}>
          Reset to Default
        </Button>
        <Button size="small" startIcon={<Download size={14} />} onClick={handleExport}>
          Export
        </Button>
        <Button size="small" startIcon={<Upload size={14} />} onClick={() => importInputRef.current?.click()}>
          Import
        </Button>
        <input
          ref={importInputRef}
          type="file"
          accept="application/json"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleImportFile(file);
            e.target.value = "";
          }}
        />
      </Stack>

      <Divider />

      <Stack direction="row" spacing={1}>
        <TextField
          size="small"
          placeholder="New rule name"
          value={newRuleName}
          onChange={(e) => setNewRuleName(e.target.value)}
          fullWidth
        />
        <Button
          size="small"
          variant="contained"
          startIcon={<Plus size={14} />}
          disabled={!newRuleName.trim()}
          onClick={() => {
            onDraftChange({ ...draft, rule_name: newRuleName.trim() });
            onSaveAsNew();
            setNewRuleName("");
          }}
        >
          Save As
        </Button>
      </Stack>

      <Stack direction="row" spacing={1}>
        <Button
          size="small"
          startIcon={<Save size={14} />}
          disabled={isDefault}
          onClick={onUpdateCurrent}
          fullWidth
          variant="outlined"
        >
          Update "{isDefault ? "-" : draft.rule_name}"
        </Button>
        <Button
          size="small"
          color="error"
          startIcon={<Trash2 size={14} />}
          disabled={isDefault}
          onClick={onDeleteCurrent}
        >
          Delete
        </Button>
      </Stack>
    </Stack>
  );
}
