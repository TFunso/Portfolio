"use client";

import { useState } from "react";
import type { DigestSuggestion } from "@/types";
import { goalMetricLabel } from "@/lib/goals";

export interface WeeklyDigestData {
  id: string;
  summary: string;
  weekLabel: string;
  entryCount: number;
  suggestions: DigestSuggestion[];
}

export default function WeeklyPatterns({ digest }: { digest: WeeklyDigestData | null }) {
  const [applied, setApplied] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState<number | null>(null);

  if (!digest) return null;

  async function apply(index: number, suggestion: DigestSuggestion) {
    setBusy(index);
    try {
      if (suggestion.suggestedGoalKey) {
        await fetch("/api/goals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ metricKey: suggestion.suggestedGoalKey, note: suggestion.description }),
        });
      } else {
        await fetch("/api/evidence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            whatHappened: suggestion.description,
            whyItMattered: suggestion.description,
            businessImpact: suggestion.description,
            category: suggestion.suggestedCategory ?? "Continuous Improvement",
            impactLevel: "Medium",
            suggestedReviewLanguage: suggestion.description,
          }),
        });
      }
      setApplied((prev) => new Set(prev).add(index));
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="card">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          This Week&apos;s Patterns
        </h2>
        <span className="text-xs text-slate-400">{digest.weekLabel}</span>
      </div>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{digest.summary}</p>

      {digest.suggestions.length > 0 && (
        <ul className="mt-3 space-y-2">
          {digest.suggestions.map((s, i) => (
            <li
              key={i}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-800"
            >
              <span>
                {s.description}
                {s.suggestedGoalKey && (
                  <span className="ml-2 badge badge-category">{goalMetricLabel(s.suggestedGoalKey)}</span>
                )}
              </span>
              <button
                className="btn-secondary text-xs"
                disabled={applied.has(i) || busy === i}
                onClick={() => apply(i, s)}
              >
                {applied.has(i) ? "Logged ✓" : busy === i ? "Logging…" : s.suggestedGoalKey ? "Log metric" : "Log as evidence"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
