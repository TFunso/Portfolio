"use client";

import { useCallback, useEffect, useState } from "react";
import { StatusDot } from "@/components/Badges";
import { GOAL_METRICS } from "@/lib/goals";
import type { GoalMetricStatus } from "@/types";

export default function GoalsPage() {
  const [metrics, setMetrics] = useState<GoalMetricStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [logging, setLogging] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/goals");
    if (res.ok) setMetrics((await res.json()).metrics);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function logManually(metricKey: string) {
    setLogging(metricKey);
    await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ metricKey }),
    });
    await load();
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
    </div>
  );
}
