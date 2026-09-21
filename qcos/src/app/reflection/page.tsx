"use client";

import { useCallback, useEffect, useState } from "react";
import { MONTH_NAMES } from "@/lib/dates";

interface ReflectionItem {
  id: string;
  month: number;
  year: number;
  answers: string[];
}

export default function ReflectionPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [answers, setAnswers] = useState(["", "", ""]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [history, setHistory] = useState<ReflectionItem[]>([]);

  const loadHistory = useCallback(async () => {
    const res = await fetch("/api/reflection");
    if (res.ok) setHistory((await res.json()).reflections);
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  async function submit() {
    if (answers.some((a) => !a.trim()) || saving) return;
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/reflection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, year, answers }),
      });
      if (res.ok) {
        setSaved(true);
        setAnswers(["", "", ""]);
        loadHistory();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Monthly Reflection</h1>
        <p className="mt-1 text-slate-500 dark:text-slate-400">
          What are 3 things you did this month that made somebody else's job easier?
        </p>
      </div>

      <div className="card space-y-4">
        <div className="flex flex-wrap gap-3">
          <select className="input w-auto" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {MONTH_NAMES.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
          <select className="input w-auto" value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {[year - 1, year, year + 1].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        {answers.map((a, i) => (
          <label key={i} className="block text-sm">
            {i + 1}.
            <textarea
              className="input mt-1"
              rows={2}
              value={a}
              onChange={(e) => setAnswers(answers.map((prev, idx) => (idx === i ? e.target.value : prev)))}
              placeholder="e.g. Documented the new inspection technique so the next shift didn't have to re-learn it"
            />
          </label>
        ))}
        <button className="btn-primary" onClick={submit} disabled={saving}>
          {saving ? "Saving…" : "Save reflection"}
        </button>
        {saved && (
          <p className="text-sm text-status-green">
            Saved. All three were converted into evidence and added to your vault.
          </p>
        )}
      </div>

      {history.length > 0 && (
        <div className="card">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Past Reflections
          </h2>
          <ul className="mt-3 space-y-4">
            {history.map((r) => (
              <li key={r.id}>
                <p className="text-sm font-semibold">
                  {MONTH_NAMES[r.month - 1]} {r.year}
                </p>
                <ul className="mt-1 list-inside list-disc text-sm text-slate-500 dark:text-slate-400">
                  {r.answers.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
