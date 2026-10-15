"use client";

import { useCallback, useEffect, useState } from "react";
import { StatusDot, PaceBadge } from "@/components/Badges";
import KpiTrendChart from "@/components/KpiTrendChart";
import { GOAL_METRICS } from "@/lib/goals";
import type { GoalMetricKey, GoalMetricStatus } from "@/types";
import type { KpiTrendPoint } from "@/lib/kpiTrend";

export default function GoalsPage() {
  const [metrics, setMetrics] = useState<GoalMetricStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [logging, setLogging] = useState<string | null>(null);

  const [trendPoints, setTrendPoints] = useState<KpiTrendPoint[]>([]);
  const [trendLoading, setTrendLoading] = useState(true);
  const [trendMonths, setTrendMonths] = useState(6);
  const [trendMetric, setTrendMetric] = useState<GoalMetricKey | "">("");

  const load = useCallback(async () => {
    const res = await fetch("/api/goals");
    if (res.ok) setMetrics((await res.json()).metrics);
    setLoading(false);
  }, []);

  const loadTrend = useCallback(async () => {
    setTrendLoading(true);
    const params = new URLSearchParams({ months: String(trendMonths) });
    if (trendMetric) params.set("metricKey", trendMetric);
    const res = await fetch(`/api/goals/trend?${params.toString()}`);
    if (res.ok) setTrendPoints((await res.json()).points);
    setTrendLoading(false);
  }, [trendMonths, trendMetric]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    loadTrend();
  }, [loadTrend]);

  async function logManually(metricKey: string) {
    setLogging(metricKey);
    await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ metricKey }),
    });
    await Promise.all([load(), loadTrend()]);
    setLogging(null);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Goal Dashboard</h1>
        <p className="mt-1 text-slate-500 dark:text-slate-400">DRIVE EFFICIENCY - annual objectives and metrics.</p>
      </div>

      {loading ? (
        <div className="card animate-pulse text-sm text-slate-400">Loading…</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {metrics.map((m) => {
            const def = GOAL_METRICS.find((d) => d.key === m.key)!;
            return (
              <div key={m.key} className="card">
                <div className="flex items-start justify-between">
                  <h2 className="font-semibold">{m.label}</h2>
                  <StatusDot status={m.status} />
                </div>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{def.description}</p>
                <p className="mt-3 text-2xl font-bold">
                  {m.actual}
                  {m.comparator !== "ongoing" && (
                    <span className="text-base font-normal text-slate-400">
                      {" "}
                      / {m.comparator === "max" ? `fewer than ${m.target + 1}` : m.target}
                    </span>
                  )}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <PaceBadge paceStatus={m.paceStatus} />
                  {m.paceStatus !== "too-early" && (
                    <span className="text-xs text-slate-400">projected {m.projected} by Dec 31</span>
                  )}
                </div>
                <button
                  className="btn-secondary mt-3 text-xs"
                  disabled={logging === m.key}
                  onClick={() => logManually(m.key)}
                >
                  {logging === m.key ? "Logging…" : "+ Log one manually"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      <section className="card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              KPI Trend
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              How many metric events were captured automatically from entries vs. logged by hand, per month.
            </p>
          </div>
          <div className="flex gap-2">
            <select
              className="input w-auto text-sm"
              value={trendMetric}
              onChange={(e) => setTrendMetric(e.target.value as GoalMetricKey | "")}
            >
              <option value="">All metrics</option>
              {GOAL_METRICS.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </select>
            <select
              className="input w-auto text-sm"
              value={trendMonths}
              onChange={(e) => setTrendMonths(Number(e.target.value))}
            >
              <option value={3}>3 months</option>
              <option value={6}>6 months</option>
              <option value={12}>12 months</option>
            </select>
          </div>
        </div>

        <div className="mt-4">
          {trendLoading ? (
            <div className="h-40 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
          ) : trendPoints.every((p) => p.total === 0) ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Nothing logged in this window yet - captured and reported counts will show up here once they are.
            </p>
          ) : (
            <KpiTrendChart points={trendPoints} />
          )}
        </div>
      </section>
    </div>
  );
}
