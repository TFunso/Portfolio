"use client";

import { useState } from "react";

const EXAMPLES = [
  "Inspected 6 lots",
  "Worked hot sheets",
  "Helped planner locate material",
  "Assisted QE investigation",
  "Created a QN",
];

export default function BrainDumpForm({ onSaved }: { onSaved?: () => void }) {
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [lastResult, setLastResult] = useState<{ counts: boolean; reason: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const content = value.trim();
    if (!content || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("Could not save entry.");
      const data = await res.json();
      setLastResult({
        counts: data.entry.classification.counts,
        reason: data.entry.classification.reason,
      });
      setValue("");
      onSaved?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div className="card">
      <label htmlFor="brain-dump" className="mb-2 block text-lg font-semibold">
        What did you do today?
      </label>
      <textarea
        id="brain-dump"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Inspected 6 lots. Helped planner locate urgent material. Created a QN for a drawing discrepancy..."
        rows={4}
        className="input resize-none text-base"
        autoFocus
      />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Type naturally, no categories needed &middot; e.g. {EXAMPLES.slice(0, 3).join(" · ")}
        </p>
        <button type="button" onClick={submit} disabled={!value.trim() || saving} className="btn-primary">
          {saving ? "Saving…" : "Log it"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
      {lastResult && (
        <div
          className={`mt-3 rounded-xl border p-3 text-sm ${
            lastResult.counts
              ? "border-status-green/30 bg-green-50 text-green-800 dark:bg-green-950/40 dark:text-green-300"
              : "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300"
          }`}
        >
          <strong>{lastResult.counts ? "This counted." : "Logged."}</strong> {lastResult.reason}
        </div>
      )}
    </div>
  );
}
