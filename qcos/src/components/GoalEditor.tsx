"use client";

import { useState } from "react";
import type { GoalMetricDefinition, GoalSet } from "@/lib/goals";

type Comparator = GoalMetricDefinition["comparator"];

interface DraftMetric {
  key?: string; // existing goals keep their id
  label: string;
  comparator: Comparator;
  target: string;
  description: string;
  keywords: string; // comma-separated
}

const COMPARATORS: { value: Comparator; label: string }[] = [
  { value: "min", label: "At least" },
  { value: "max", label: "No more than" },
  { value: "ongoing", label: "Ongoing (no fixed number)" },
];

function toDraft(m: GoalMetricDefinition): DraftMetric {
  return {
    key: m.key,
    label: m.label,
    comparator: m.comparator,
    target: String(m.target),
    description: m.description,
    keywords: m.keywords.join(", "),
  };
}

const EMPTY: DraftMetric = { label: "", comparator: "min", target: "1", description: "", keywords: "" };

// Edit one year's goals: the annual goal's name, its objectives, and the
// measurable targets - each with the words that log it automatically from
// a daily entry. Saving only changes the selected year; past years keep
// their own goals.
export default function GoalEditor({
  year,
  initial,
  onSaved,
  onCancel,
}: {
  year: number;
  initial: GoalSet;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial.name);
  const [objectives, setObjectives] = useState(initial.objectives.join("\n"));
  const [metrics, setMetrics] = useState<DraftMetric[]>(initial.metrics.map(toDraft));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (i: number, patch: Partial<DraftMetric>) =>
    setMetrics((prev) => prev.map((m, j) => (j === i ? { ...m, ...patch } : m)));

  async function save() {
    setError(null);
    const body = {
      name,
      objectives: objectives
        .split("\n")
        .map((o) => o.trim())
        .filter(Boolean),
      metrics: metrics.map((m) => ({
        key: m.key,
        label: m.label,
        comparator: m.comparator,
        target: m.comparator === "ongoing" ? 0 : Number(m.target),
        description: m.description,
        keywords: m.keywords
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean),
      })),
    };
    const bad = body.metrics.find((m) => m.comparator !== "ongoing" && (!Number.isInteger(m.target) || m.target < 0));
    if (bad) {
      setError(`"${bad.label || "A target"}" needs a whole number.`);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/goals?year=${year}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "Couldn't save the goals.");
        return;
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="card space-y-4">
      <div>
        <h2 className="font-semibold">Edit {year} goals</h2>
        <p className="text-xs text-slate-400">
          Only {year} changes - earlier years keep their own goals, so past reports aren&apos;t re-scored.
        </p>
      </div>

      <label className="block text-sm font-medium">
        Annual goal name
        <input className="input mt-1" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. DRIVE EFFICIENCY" />
      </label>

      <label className="block text-sm font-medium">
        Objectives <span className="font-normal text-slate-400">(one per line)</span>
        <textarea
          className="input mt-1 min-h-[120px]"
          value={objectives}
          onChange={(e) => setObjectives(e.target.value)}
          placeholder={"Perform priority inspections\nShare knowledge"}
        />
      </label>

      <div className="space-y-3">
        <h3 className="text-sm font-medium">Measurable targets</h3>
        {metrics.map((m, i) => (
          <div key={m.key ?? `new-${i}`} className="space-y-2 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
            <div className="flex flex-wrap items-end gap-2">
              <label className="min-w-[12rem] flex-1 text-xs text-slate-500 dark:text-slate-400">
                Target name
                <input className="input mt-0.5" value={m.label} onChange={(e) => update(i, { label: e.target.value })} />
              </label>
              <label className="text-xs text-slate-500 dark:text-slate-400">
                Type
                <select
                  className="input mt-0.5 w-auto"
                  value={m.comparator}
                  onChange={(e) => update(i, { comparator: e.target.value as Comparator })}
                >
                  {COMPARATORS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
              {m.comparator !== "ongoing" && (
                <label className="w-24 text-xs text-slate-500 dark:text-slate-400">
                  Number
                  <input
                    className="input mt-0.5"
                    inputMode="numeric"
                    value={m.target}
                    onChange={(e) => update(i, { target: e.target.value })}
                  />
                </label>
              )}
              <button
                type="button"
                className="mb-1 text-xs text-slate-400 hover:text-red-500"
                onClick={() => setMetrics((prev) => prev.filter((_, j) => j !== i))}
              >
                Remove
              </button>
            </div>
            <label className="block text-xs text-slate-500 dark:text-slate-400">
              What counts
              <input
                className="input mt-0.5"
                value={m.description}
                onChange={(e) => update(i, { description: e.target.value })}
                placeholder="e.g. Suppliers identified as candidates for certification"
              />
            </label>
            <label className="block text-xs text-slate-500 dark:text-slate-400">
              Auto-detect words <span className="text-slate-400">(comma-separated - an entry containing any of them logs one)</span>
              <input
                className="input mt-0.5"
                value={m.keywords}
                onChange={(e) => update(i, { keywords: e.target.value })}
                placeholder="e.g. supplier cert, certify supplier"
              />
            </label>
          </div>
        ))}
        <button type="button" className="btn-secondary text-xs" onClick={() => setMetrics((prev) => [...prev, { ...EMPTY }])}>
          + Add a target
        </button>
      </div>

      {error && <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button className="btn-primary" disabled={saving} onClick={save}>
          {saving ? "Saving…" : `Save ${year} goals`}
        </button>
        <button className="btn-secondary" disabled={saving} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </section>
  );
}
