"use client";

import { useState } from "react";
import { queueEntry } from "@/lib/offlineQueue";
import { formatMetrics, hasMetrics, type ResultMetrics } from "@/lib/metrics";
import ResultEditor, { StarButton } from "@/components/ResultEditor";

interface LastSaved {
  entryId: string;
  hasEvidence: boolean;
  metrics: ResultMetrics;
  metricsSaved: boolean;
  starred: boolean;
}

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
  const [lastSaved, setLastSaved] = useState<LastSaved | null>(null);
  const [editingResult, setEditingResult] = useState(false);
  const [resultNote, setResultNote] = useState<string | null>(null);

  async function patchResult(body: Record<string, unknown>): Promise<boolean> {
    if (!lastSaved) return false;
    const res = await fetch(`/api/entries/${lastSaved.entryId}/result`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return false;
    const { evidence } = await res.json();
    setLastSaved({
      entryId: lastSaved.entryId,
      hasEvidence: true,
      metrics: evidence,
      metricsSaved: true,
      starred: evidence.starred,
    });
    onSaved?.();
    return true;
  }

  async function toggleStar() {
    if (!lastSaved) return;
    const ok = await patchResult({ starred: !lastSaved.starred });
    if (ok) setResultNote(lastSaved.starred ? null : "Starred - this will lead your reports.");
  }

  async function submit() {
    const content = value.trim();
    if (!content || saving) return;
    setSaving(true);
    setError(null);

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      queueEntry(content);
      setLastResult(null);
      setValue("");
      setSaving(false);
      setError("You're offline - saved locally and will log automatically once you're back online.");
      return;
    }

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
      setLastSaved({
        entryId: data.entry.id,
        hasEvidence: Boolean(data.evidence),
        metrics: data.evidence ?? data.suggestedMetrics ?? {},
        metricsSaved: Boolean(data.evidence),
        starred: false,
      });
      setEditingResult(false);
      setResultNote(null);
      setValue("");
      onSaved?.();
    } catch (e) {
      // Network error (not an HTTP error response) usually means the
      // request never reached the server - treat it the same as offline
      // instead of losing the entry.
      if (e instanceof TypeError) {
        queueEntry(content);
        setValue("");
        setError("Couldn't reach the server - saved locally and will log automatically once you're back online.");
      } else {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
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
      {lastResult && lastSaved && (
        <div className="mt-3 space-y-2 rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-slate-600 dark:text-slate-300">
              {hasMetrics(lastSaved.metrics) ? (
                <>
                  <span className="font-medium">Result: </span>
                  {formatMetrics(lastSaved.metrics)}
                  {!lastSaved.metricsSaved && <span className="text-slate-400"> (found in your note - save to keep)</span>}
                </>
              ) : (
                <span className="text-slate-500 dark:text-slate-400">
                  Any result to add? Numbers make reviews land.
                </span>
              )}
            </p>
            <div className="flex gap-2">
              <StarButton starred={lastSaved.starred} onToggle={toggleStar} />
              {!editingResult && !lastSaved.metricsSaved && hasMetrics(lastSaved.metrics) && (
                <button
                  type="button"
                  className="btn-primary px-2.5 py-1 text-xs"
                  onClick={async () => {
                    if (await patchResult(lastSaved.metrics)) setResultNote("Result saved.");
                  }}
                >
                  Keep result
                </button>
              )}
              {!editingResult && (
                <button type="button" className="btn-secondary px-2.5 py-1 text-xs" onClick={() => setEditingResult(true)}>
                  {hasMetrics(lastSaved.metrics) ? "Edit result" : "+ Add result"}
                </button>
              )}
            </div>
          </div>
          {editingResult && (
            <ResultEditor
              initial={lastSaved.metrics}
              onCancel={() => setEditingResult(false)}
              onSave={async (metrics) => {
                const ok = await patchResult(metrics);
                if (ok) {
                  setEditingResult(false);
                  setResultNote("Result saved.");
                }
                return ok;
              }}
            />
          )}
          {resultNote && <p className="text-xs text-green-700 dark:text-green-400">{resultNote}</p>}
        </div>
      )}
    </div>
  );
}
