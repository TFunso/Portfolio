import { StatusDot } from "@/components/Badges";
import type { GoalMetricStatus } from "@/types";

function actualLabel(m: GoalMetricStatus): string {
  if (m.comparator === "max") return `${m.actual} (target: fewer than ${m.target + 1})`;
  if (m.comparator === "ongoing") return `${m.actual}`;
  return `${m.actual} / ${m.target}`;
}

export default function GoalDashboard({ metrics, compact = false }: { metrics: GoalMetricStatus[]; compact?: boolean }) {
  return (
    <section className="card">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Goal Dashboard &middot; DRIVE EFFICIENCY
      </h2>
      <ul className={`mt-3 grid gap-3 ${compact ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
        {metrics.map((m) => (
          <li
            key={m.key}
            className="flex items-start justify-between gap-2 rounded-xl border border-slate-200 p-3 dark:border-slate-800"
          >
            <div>
              <p className="text-sm font-medium">{m.label}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{actualLabel(m)}</p>
            </div>
            <StatusDot status={m.status} />
          </li>
        ))}
      </ul>
    </section>
  );
}
