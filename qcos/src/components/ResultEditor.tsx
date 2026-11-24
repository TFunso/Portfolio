"use client";

import { useState } from "react";
import { RESULT_METRICS, type ResultMetricKey, type ResultMetrics } from "@/lib/metrics";

// The five results plus SIRs, then effort (hours spent) last.
const EDITOR_FIELDS: { key: ResultMetricKey | "hoursSpent"; label: string; integer: boolean }[] = [
  ...RESULT_METRICS,
  { key: "hoursSpent", label: "Hours spent", integer: false },
];

type Draft = Record<ResultMetricKey | "hoursSpent", string>;

function toDraft(m: ResultMetrics): Draft {
  return Object.fromEntries(
    EDITOR_FIELDS.map((def) => [def.key, typeof m[def.key] === "number" && (m[def.key] as number) > 0 ? String(m[def.key]) : ""]),
  ) as Draft;
}

// The five result fields as small number inputs. Blank = no result for that
// field (saved as cleared). Used right after logging and in the Evidence
// Vault.
export default function ResultEditor({
  initial,
  onSave,
  onCancel,
  saveLabel = "Save result",
}: {
  initial: ResultMetrics;
  onSave: (metrics: ResultMetrics) => Promise<boolean>;
  onCancel?: () => void;
  saveLabel?: string;
}) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(initial));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const metrics: ResultMetrics = {};
    for (const def of EDITOR_FIELDS) {
      const raw = draft[def.key].trim().replace(/[$,]/g, "");
      if (raw === "") {
        metrics[def.key] = null;
        continue;
      }
      const value = Number(raw);
      if (!Number.isFinite(value) || value < 0) {
        setError(`"${def.label}" needs a number.`);
        return;
      }
      metrics[def.key] = value;
    }
    setError(null);
    setSaving(true);
    try {
      const ok = await onSave(metrics);
      if (!ok) setError("Couldn't save - try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {EDITOR_FIELDS.map((def) => (
          <label key={def.key} className="text-xs text-slate-500 dark:text-slate-400">
            {def.label}
            <input
              className="input mt-0.5 px-2 py-1.5"
              inputMode={def.integer ? "numeric" : "decimal"}
              placeholder="-"
              value={draft[def.key]}
              onChange={(e) => setDraft((d) => ({ ...d, [def.key]: e.target.value }))}
            />
          </label>
        ))}
      </div>
      {error && <p className="text-xs font-medium text-red-600 dark:text-red-400">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-primary px-3 py-1.5" disabled={saving} onClick={save}>
          {saving ? "Saving…" : saveLabel}
        </button>
        {onCancel && (
          <button type="button" className="btn-secondary px-3 py-1.5" disabled={saving} onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

export function StarButton({
  starred,
  onToggle,
  className = "",
}: {
  starred: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={starred}
      title={starred ? "Top win - leads every report. Click to unstar." : "Mark as a top win - it will lead every report"}
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold transition ${
        starred
          ? "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200"
          : "border-slate-300 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
      } ${className}`}
    >
      <span aria-hidden>{starred ? "★" : "☆"}</span> Top win
    </button>
  );
}
