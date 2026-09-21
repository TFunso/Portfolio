"use client";

import { useCallback, useEffect, useState } from "react";
import { ImpactBadge, CategoryBadge } from "@/components/Badges";
import { formatDate, MONTH_NAMES } from "@/lib/dates";

const CATEGORIES = [
  "Cross-Functional Support",
  "Leadership",
  "Quality Improvement",
  "Technical Expertise",
  "Knowledge Sharing",
  "Continuous Improvement",
  "Customer Support",
  "Goal Contributions",
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
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (month) params.set("month", month);
    if (category) params.set("category", category);
    if (impactLevel) params.set("impactLevel", impactLevel);
    const res = await fetch(`/api/evidence?${params.toString()}`);
    if (res.ok) setRecords((await res.json()).records);
    setLoading(false);
  }, [month, category, impactLevel]);

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

      <div className="card flex flex-wrap gap-3">
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
                <button
                  onClick={() => remove(r.id)}
                  className="text-xs text-slate-400 hover:text-red-500"
                  aria-label="Delete"
                >
                  Delete
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <ImpactBadge level={r.impactLevel} />
                <CategoryBadge category={r.category} />
                <span className="text-xs text-slate-400">{formatDate(r.recordDate)}</span>
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
