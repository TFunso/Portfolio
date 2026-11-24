"use client";

import { useCallback, useEffect, useState } from "react";
import { StatusDot, PaceBadge } from "@/components/Badges";
import KpiTrendChart from "@/components/KpiTrendChart";
import GoalEditor from "@/components/GoalEditor";
import type { GoalMetricDefinition } from "@/lib/goals";
import type { GoalMetricKey, GoalMetricStatus } from "@/types";
import type { KpiTrendPoint } from "@/lib/kpiTrend";

interface GoalsResponse {
  year: number;
  goal: { name: string; objectives: string[] };
  source: "saved" | "carried-over" | "default";
  fromYear: number | null;
  definitions: GoalMetricDefinition[];
  savedYears: number[];
  metrics: GoalMetricStatus[];
}

const THIS_YEAR = new Date().getFullYear();
const YEARS = [THIS_YEAR + 1, THIS_YEAR, THIS_YEAR - 1, THIS_YEAR - 2];

export default function GoalsPage() {
  const [year, setYear] = useState(THIS_YEAR);
  const [data, setData] = useState<GoalsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [savedNote, setSavedNote] = useState<string | null>(null);
  const [logging, setLogging] = useState<string | null>(null);

  const [trendPoints, setTrendPoints] = useState<KpiTrendPoint[]>([]);
  const [trendLoading, setTrendLoading] = useState(true);
  const [trendMonths, setTrendMonths] = useState(6);
  const [trendMetric, setTrendMetric] = useState<GoalMetricKey | "">("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/goals?year=${year}`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, [year]);

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

  const isCurrentYear = year === THIS_YEAR;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Goal Dashboard</h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            {data ? `${data.goal.name} - ${year} objectives and targets.` : "Annual objectives and targets."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            className="input w-auto"
            value={year}
            onChange={(e) => {
              setYear(Number(e.target.value));
              setEditing(false);
              setSavedNote(null);
            }}
            aria-label="Year"
          >
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          {!editing && data && (
            <button className="btn-secondary" onClick={() => setEditing(true)}>
              Edit {year} goals
            </button>
          )}
        </div>
      </div>

      {savedNote && (
        <p role="status" className="rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-800 dark:bg-green-950 dark:text-green-200">
          {savedNote}
        </p>
      )}

      {data && !editing && data.source !== "saved" && (
        <div className="card border-brand-200 bg-brand-50/60 text-sm dark:border-brand-900 dark:bg-brand-900/20">
          {data.source === "carried-over" ? (
            <>
              <strong>{year} is using your {data.fromYear} goals.</strong> When you get your {year} goals, click &ldquo;Edit{" "}
              {year} goals&rdquo; - {data.fromYear} will keep its own goals and scores.
            </>
          ) : (
            <>
              <strong>These are the starting goals.</strong> Edit them any time; once saved, later years carry them over
              until you change them.
            </>
          )}
        </div>
      )}

      {editing && data && (
        <GoalEditor
          year={year}
          initial={{ name: data.goal.name, objectives: data.goal.objectives, metrics: data.definitions }}
          onCancel={() => setEditing(false)}
          onSaved={async () => {
            setEditing(false);
            setSavedNote(`${year} goals saved. Reports for ${year} now use them.`);
            await Promise.all([load(), loadTrend()]);
          }}
        />
      )}

      {data && data.goal.objectives.length > 0 && !editing && (
        <section className="card">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Objectives</h2>
          <ul className="mt-2 grid list-disc gap-x-6 gap-y-1 pl-5 text-sm sm:grid-cols-2">
            {data.goal.objectives.map((o) => (
              <li key={o}>{o}</li>
            ))}
          </ul>
        </section>
      )}

      {loading || !data ? (
        <div className="card animate-pulse text-sm text-slate-400">Loading…</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {data.metrics.map((m) => (
            <div key={m.key} className="card">
              <div className="flex items-start justify-between">
                <h2 className="font-semibold">{m.label}</h2>
                <StatusDot status={m.status} />
              </div>
              {m.description && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{m.description}</p>}
              <p className="mt-3 text-2xl font-bold">
                {m.actual}
                {m.comparator !== "ongoing" && (
                  <span className="text-base font-normal text-slate-400">
                    {" "}
                    / {m.comparator === "max" ? `fewer than ${m.target + 1}` : m.target}
                  </span>
                )}
              </p>
              {isCurrentYear && (
                <>
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
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <section className="card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              KPI Trend
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              How many goal events were captured automatically from entries vs. logged by hand, per month.
            </p>
          </div>
          <div className="flex gap-2">
            <select
              className="input w-auto text-sm"
              value={trendMetric}
              onChange={(e) => setTrendMetric(e.target.value as GoalMetricKey | "")}
            >
              <option value="">All goals</option>
              {data?.definitions.map((m) => (
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
