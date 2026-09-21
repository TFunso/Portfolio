"use client";

import { useCallback, useEffect, useState } from "react";
import { MONTH_NAMES } from "@/lib/dates";

interface Row {
  department: string;
  count: number;
  examples: string[];
}

export default function CrossFunctionalPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [rows, setRows] = useState<Row[]>([]);
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/cross-functional?month=${month}&year=${year}`);
    if (res.ok) {
      const data = await res.json();
      setRows(data.rows);
      setSummary(data.summary);
    }
    setLoading(false);
  }, [month, year]);

  useEffect(() => {
    load();
  }, [load]);

  const maxCount = Math.max(1, ...rows.map((r) => r.count));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Cross-Functional Impact Recognition</h1>
        <p className="mt-1 text-slate-500 dark:text-slate-400">
          Support you provided to Planning, Buyers, QE, ME, Warehouse, Receiving Inspection, and Operations.
        </p>
      </div>

      <div className="card flex flex-wrap gap-3">
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

      <div className="card">
        <p className="text-sm text-slate-600 dark:text-slate-300">{summary}</p>
      </div>

      {loading ? (
        <div className="card animate-pulse text-sm text-slate-400">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="card text-sm text-slate-500 dark:text-slate-400">
          Nothing logged for this month yet.
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <div key={row.department} className="card">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">{row.department}</h2>
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{row.count}</span>
              </div>
              <div className="mt-2 h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-2 rounded-full bg-brand-500"
                  style={{ width: `${(row.count / maxCount) * 100}%` }}
                />
              </div>
              {row.examples.length > 0 && (
                <ul className="mt-3 space-y-1 text-sm text-slate-500 dark:text-slate-400">
                  {row.examples.map((ex, i) => (
                    <li key={i}>&bull; {ex}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
