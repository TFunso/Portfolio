"use client";

import { useCallback, useEffect, useState } from "react";
import { ImpactBadge, CategoryBadge } from "@/components/Badges";
import ManagerPrepExport from "@/components/ManagerPrepExport";
import { formatDate, MONTH_NAMES } from "@/lib/dates";
import { formatMetrics, hasMetrics, metricsOf, type ResultMetrics } from "@/lib/metrics";
import ResultEditor, { StarButton } from "@/components/ResultEditor";

const CATEGORIES = [
  "Cross-Functional Support",
  "Leadership",
  "Quality Improvement",
  "Technical Expertise",
  "Knowledge Sharing",
  "Continuous Improvement",
  "Customer Support",
  "Goal Contributions",
  "First Article (SIR)",
];

interface EvidenceRecord {
  id: string;
  whatHappened: string;
  whyItMattered: string;
  businessImpact: string;
  goalSupported: string | null;
  category: string;
  impactLevel: string;
  suggestedReviewLanguage: string;
  source: string;
  recordDate: string;
  starred: boolean;
  hoursSaved: number | null;
  unitsHandled: number | null;
  defectsCaught: number | null;
  delayDaysAvoided: number | null;
  costAvoided: number | null;
}

const emptyForm = {
  whatHappened: "",
  whyItMattered: "",
  businessImpact: "",
  goalSupported: "",
  category: CATEGORIES[0],
  impactLevel: "Medium",
  suggestedReviewLanguage: "",
};

export default function EvidenceVaultPage() {
  const [records, setRecords] = useState<EvidenceRecord[]>([]);
  const [month, setMonth] = useState("");
  const [category, setCategory] = useState("");
  const [impactLevel, setImpactLevel] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [starredOnly, setStarredOnly] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanNote, setScanNote] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (month) params.set("month", month);
    if (category) params.set("category", category);
    if (impactLevel) params.set("impactLevel", impactLevel);
    if (debouncedSearch) params.set("q", debouncedSearch);
    if (starredOnly) params.set("starred", "true");
    const res = await fetch(`/api/evidence?${params.toString()}`);
    if (res.ok) setRecords((await res.json()).records);
    setLoading(false);
  }, [month, category, impactLevel, debouncedSearch, starredOnly]);

  useEffect(() => {
    load();
  }, [load]);

  async function submitManual(e: React.FormEvent) {
    e.preventDefault();
    if (!form.whatHappened.trim()) return;
    const res = await fetch("/api/evidence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setForm(emptyForm);
      setShowForm(false);
      load();
    }
  }

  async function patchRecord(id: string, body: Record<string, unknown>): Promise<boolean> {
    const res = await fetch(`/api/evidence/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return false;
    const { record } = await res.json();
    setRecords((prev) => prev.map((r) => (r.id === id ? { ...r, ...record } : r)));
    return true;
  }

  async function scanForNumbers() {
    setScanning(true);
    setScanNote(null);
    try {
      const res = await fetch("/api/evidence/extract-metrics", { method: "POST" });
      if (res.ok) {
        const { updated, scanned, filedSirEntries } = await res.json();
        const sirNote =
          filedSirEntries > 0 ? ` Also filed ${filedSirEntries} older SIR / first article entr${filedSirEntries === 1 ? "y" : "ies"} as evidence.` : "";
        setScanNote(
          (updated > 0
            ? `Found results in ${updated} older entr${updated === 1 ? "y" : "ies"}.`
            : `Checked ${scanned} entries without a result - no numbers found. Add results by hand with "+ Add result".`) + sirNote,
        );
        load();
      }
    } finally {
      setScanning(false);
    }
  }

  async function remove(id: string) {
    await fetch(`/api/evidence/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Evidence Vault</h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            High-value accomplishments, filed automatically and manually.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cancel" : "+ Add evidence"}
        </button>
      </div>

      <ManagerPrepExport />

      {showForm && (
        <form onSubmit={submitManual} className="card space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              What Happened
              <textarea
                required
                className="input mt-1"
                rows={2}
                value={form.whatHappened}
                onChange={(e) => setForm({ ...form, whatHappened: e.target.value })}
              />
            </label>
            <label className="text-sm">
              Why It Mattered
              <textarea
                required
                className="input mt-1"
                rows={2}
                value={form.whyItMattered}
                onChange={(e) => setForm({ ...form, whyItMattered: e.target.value })}
              />
            </label>
            <label className="text-sm">
              Business Impact
              <textarea
                required
                className="input mt-1"
                rows={2}
                value={form.businessImpact}
                onChange={(e) => setForm({ ...form, businessImpact: e.target.value })}
              />
            </label>
            <label className="text-sm">
              Goal Supported (optional)
              <input
                className="input mt-1"
                value={form.goalSupported}
                onChange={(e) => setForm({ ...form, goalSupported: e.target.value })}
              />
            </label>
            <label className="text-sm">
              Category
              <select
                className="input mt-1"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Impact Level
              <select
                className="input mt-1"
                value={form.impactLevel}
                onChange={(e) => setForm({ ...form, impactLevel: e.target.value })}
              >
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
            </label>
            <label className="text-sm sm:col-span-2">
              Suggested Review Language
              <textarea
                required
                className="input mt-1"
                rows={2}
                value={form.suggestedReviewLanguage}
                onChange={(e) => setForm({ ...form, suggestedReviewLanguage: e.target.value })}
              />
            </label>
          </div>
          <button type="submit" className="btn-primary">
            Save to vault
          </button>
        </form>
      )}

      <div className="card space-y-3">
        <input
          type="search"
          className="input"
          placeholder="Search what happened, why it mattered, review language…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search evidence"
        />
        <div className="flex flex-wrap gap-3">
        <select className="input w-auto" value={month} onChange={(e) => setMonth(e.target.value)}>
          <option value="">All months</option>
          {MONTH_NAMES.map((m, i) => (
            <option key={m} value={i + 1}>
              {m}
            </option>
          ))}
        </select>
        <select className="input w-auto" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select className="input w-auto" value={impactLevel} onChange={(e) => setImpactLevel(e.target.value)}>
          <option value="">All impact levels</option>
          <option>High</option>
          <option>Medium</option>
          <option>Low</option>
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={starredOnly} onChange={(e) => setStarredOnly(e.target.checked)} />
          Top wins only
        </label>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
          <span>
            {records.filter((r) => hasMetrics(metricsOf(r))).length} of {records.length} shown have a measurable result
            &middot; {records.filter((r) => r.starred).length} starred.
          </span>
          <button type="button" className="font-semibold text-brand-600 hover:underline dark:text-brand-400" disabled={scanning} onClick={scanForNumbers}>
            {scanning ? "Scanning…" : "Find numbers in older entries"}
          </button>
          {scanNote && <span className="w-full text-green-700 dark:text-green-400">{scanNote}</span>}
        </div>
      </div>

      {loading ? (
        <div className="card animate-pulse text-sm text-slate-400">Loading…</div>
      ) : records.length === 0 ? (
        <div className="card text-sm text-slate-500 dark:text-slate-400">
          No evidence matches these filters yet.
        </div>
      ) : (
        <ul className="space-y-3">
          {records.map((r) => (
            <li key={r.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold">{r.whatHappened}</p>
                <div className="flex shrink-0 items-center gap-3">
                  <StarButton starred={r.starred} onToggle={() => patchRecord(r.id, { starred: !r.starred })} />
                  <button
                    onClick={() => remove(r.id)}
                    className="text-xs text-slate-400 hover:text-red-500"
                    aria-label="Delete"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <ImpactBadge level={r.impactLevel} />
                <CategoryBadge category={r.category} />
                <span className="text-xs text-slate-400">{formatDate(r.recordDate)}</span>
              </div>
              <div className="mt-2 text-sm">
                {editingId === r.id ? (
                  <ResultEditor
                    initial={metricsOf(r) as ResultMetrics}
                    onCancel={() => setEditingId(null)}
                    onSave={async (metrics) => {
                      const ok = await patchRecord(r.id, metrics);
                      if (ok) setEditingId(null);
                      return ok;
                    }}
                  />
                ) : (
                  <p className="flex flex-wrap items-center gap-2">
                    {hasMetrics(metricsOf(r)) ? (
                      <span>
                        <span className="text-xs font-semibold uppercase text-slate-400">Result </span>
                        {formatMetrics(metricsOf(r))}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">No measurable result yet.</span>
                    )}
                    <button
                      type="button"
                      className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400"
                      onClick={() => setEditingId(r.id)}
                    >
                      {hasMetrics(metricsOf(r)) ? "Edit result" : "+ Add result"}
                    </button>
                  </p>
                )}
              </div>
              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-semibold uppercase text-slate-400">Why It Mattered</dt>
                  <dd>{r.whyItMattered}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase text-slate-400">Business Impact</dt>
                  <dd>{r.businessImpact}</dd>
                </div>
                {r.goalSupported && (
                  <div>
                    <dt className="text-xs font-semibold uppercase text-slate-400">Goal Supported</dt>
                    <dd>{r.goalSupported}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs font-semibold uppercase text-slate-400">Suggested Review Language</dt>
                  <dd className="italic">&ldquo;{r.suggestedReviewLanguage}&rdquo;</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
