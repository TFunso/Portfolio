"use client";

import { useEffect, useState, useCallback } from "react";
import { formatDateTime } from "@/lib/dates";

interface Result {
  counts: boolean;
  businessImpact: string;
  goalAlignment: string;
  promotionValue: string;
  recommendedLanguage: string;
}

interface LogItem {
  id: string;
  activity: string;
  counts: boolean;
  businessImpact: string;
  goalAlignment: string;
  promotionValue: string;
  recommendedLanguage: string;
  savedAsEvidence: boolean;
  createdAt: string;
}

export default function DidThisCountPage() {
  const [activity, setActivity] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<LogItem[]>([]);

  const loadHistory = useCallback(async () => {
    const res = await fetch("/api/did-this-count?limit=10");
    if (res.ok) setHistory((await res.json()).logs);
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  async function evaluate(saveAsEvidence: boolean) {
    if (!activity.trim() || loading) return;
    setLoading(true);
    setSaved(false);
    try {
      const res = await fetch("/api/did-this-count", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activity, saveAsEvidence }),
      });
      const data = await res.json();
      setResult(data.result);
      setSaved(Boolean(data.log.savedAsEvidence));
      loadHistory();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Did This Count?</h1>
        <p className="mt-1 text-slate-500 dark:text-slate-400">
          Describe one thing you did. QCOS tells you whether it's worth documenting - no guesswork.
        </p>
      </div>

      <div className="card">
        <textarea
          value={activity}
          onChange={(e) => setActivity(e.target.value)}
          placeholder="e.g. Helped warehouse find material, supported an investigation, escalated a supplier issue…"
          rows={3}
          className="input resize-none"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="btn-primary" disabled={!activity.trim() || loading} onClick={() => evaluate(false)}>
            {loading ? "Checking…" : "Did this count?"}
          </button>
          <button className="btn-secondary" disabled={!activity.trim() || loading} onClick={() => evaluate(true)}>
            Check &amp; save as evidence
          </button>
        </div>
      </div>

      {result && (
        <div className="card space-y-3">
          <div
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${
              result.counts
                ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
            }`}
          >
            {result.counts ? "YES - this counts" : "NO - reads as routine"}
          </div>
          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase text-slate-400">Business Impact</dt>
              <dd className="text-sm">{result.businessImpact}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-slate-400">Goal Alignment</dt>
              <dd className="text-sm">{result.goalAlignment}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-slate-400">Promotion Value</dt>
              <dd className="text-sm">{result.promotionValue}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-slate-400">Should Save as Evidence?</dt>
              <dd className="text-sm">
                {saved ? "Saved to Evidence Vault." : result.counts ? "Recommended - use the save button above." : "Not necessary."}
              </dd>
            </div>
          </dl>
          <div>
            <dt className="text-xs font-semibold uppercase text-slate-400">Recommended Review Language</dt>
            <dd className="mt-1 rounded-lg bg-slate-50 p-3 text-sm italic dark:bg-slate-800/60">
              &ldquo;{result.recommendedLanguage}&rdquo;
            </dd>
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div className="card">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Recent Checks
          </h2>
          <ul className="mt-3 divide-y divide-slate-200 dark:divide-slate-800">
            {history.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                <div>
                  <p className="text-sm">{item.activity}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{formatDateTime(item.createdAt)}</p>
                </div>
                <span className={`badge ${item.counts ? "badge-high" : "badge-low"}`}>
                  {item.counts ? "Counted" : "Routine"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
