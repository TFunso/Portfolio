import type { PromotionStats } from "@/lib/promotionReport";
import { StatusDot } from "@/components/Badges";
import { RESULT_METRICS } from "@/lib/metrics";

// Visual one-glance companion to the Promotion Report narrative. Pure
// HTML/CSS bars (no chart library) so it reflows cleanly from phone to
// laptop and prints. Colors: one brand hue for every single-series chart,
// and a light->dark brand ramp for the ordinal impact mix - both validated
// with the dataviz palette checker in light and dark mode.

const SERIES_BAR = "bg-brand-500 dark:bg-brand-400";
const IMPACT_SHADES = {
  low: "bg-brand-300 dark:bg-brand-600",
  medium: "bg-brand-500 dark:bg-brand-400",
  high: "bg-brand-800 dark:bg-brand-200",
};

function statusWord(status: string): string {
  return status === "green" ? "On track" : status === "yellow" ? "In progress" : "Needs attention";
}

function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card break-inside-avoid p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-3xl font-bold">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

function BarList({ rows, unit }: { rows: { label: string; count: number }[]; unit: string }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.label} title={`${r.label}: ${r.count} ${unit}`}>
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="truncate">{r.label}</span>
            <span className="shrink-0 font-semibold text-slate-700 dark:text-slate-200">{r.count}</span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800">
            <div className={`h-2 rounded-full ${SERIES_BAR}`} style={{ width: `${(r.count / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function MonthlyColumns({ months }: { months: PromotionStats["monthly"] }) {
  const max = Math.max(1, ...months.map((m) => m.count));
  const peakIndex = months.reduce((best, m, i) => (m.count > months[best].count ? i : best), 0);
  const labelEvery = months.length > 12 ? 3 : 1;

  return (
    <div>
      <div className="flex h-36 items-end gap-[2px] print:h-20">
        {months.map((m, i) => (
          <div
            key={m.monthKey}
            className="relative flex h-full max-w-12 flex-1 flex-col justify-end"
            title={`${m.label}: ${m.count} piece${m.count === 1 ? "" : "s"} of evidence`}
          >
            {i === peakIndex && m.count > 0 && (
              <span className="mb-1 text-center text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                {m.count}
              </span>
            )}
            <div
              className={`w-full rounded-t ${m.count > 0 ? SERIES_BAR : "bg-slate-100 dark:bg-slate-800"}`}
              style={{ height: m.count > 0 ? `${Math.max(4, (m.count / max) * 100)}%` : "2px" }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-[2px] border-t border-slate-200 pt-1 dark:border-slate-800">
        {months.map((m, i) => (
          <span key={m.monthKey} className="max-w-12 flex-1 truncate text-center text-[10px] text-slate-400">
            {i % labelEvery === 0 ? m.label : ""}
          </span>
        ))}
      </div>
    </div>
  );
}

function ImpactMix({ totals }: { totals: PromotionStats["impactTotals"] }) {
  const sum = totals.high + totals.medium + totals.low;
  if (sum === 0) return <p className="text-sm text-slate-400">No evidence yet.</p>;
  const segments = [
    { key: "high" as const, label: "High impact", count: totals.high },
    { key: "medium" as const, label: "Medium impact", count: totals.medium },
    { key: "low" as const, label: "Low impact", count: totals.low },
  ];
  return (
    <div>
      <div className="flex h-4 gap-[2px] overflow-hidden rounded-full">
        {segments
          .filter((s) => s.count > 0)
          .map((s) => (
            <div
              key={s.key}
              className={IMPACT_SHADES[s.key]}
              style={{ width: `${(s.count / sum) * 100}%` }}
              title={`${s.label}: ${s.count} (${Math.round((s.count / sum) * 100)}%)`}
            />
          ))}
      </div>
      <ul className="mt-3 space-y-1.5 text-sm">
        {segments.map((s) => (
          <li key={s.key} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <span className={`inline-block h-2.5 w-2.5 rounded-sm ${IMPACT_SHADES[s.key]}`} />
              {s.label}
            </span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {s.count} <span className="font-normal text-slate-400">({Math.round((s.count / sum) * 100)}%)</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function GoalProgress({ goals }: { goals: PromotionStats["goalProgress"] }) {
  return (
    <ul className="space-y-3">
      {goals.map((g) => {
        const status = g.status as "green" | "yellow" | "red";
        const valueText =
          g.comparator === "min"
            ? `${g.actual} / ${g.target}`
            : g.comparator === "max"
              ? `${g.actual} (limit ${g.target})`
              : `${g.actual}`;
        return (
          <li key={g.label}>
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="truncate">{g.label}</span>
              <span className="flex shrink-0 items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <StatusDot status={status} />
                {statusWord(g.status)} &middot; <span className="font-semibold text-slate-700 dark:text-slate-200">{valueText}</span>
              </span>
            </div>
            {g.comparator === "min" && (
              <div className="mt-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className={`h-1.5 rounded-full ${SERIES_BAR}`}
                  style={{ width: `${Math.min(100, (g.actual / Math.max(1, g.target)) * 100)}%` }}
                />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export default function PromotionDashboard({ stats }: { stats: PromotionStats }) {
  const goalsOnTrack = stats.goalProgress.filter((g) => g.status === "green").length;
  const topStrengths = stats.categoryTotals.slice(0, 6).map((c) => ({ label: c.category, count: c.count }));
  const teams = stats.crossFunctional.slice(0, 6).map((d) => ({ label: d.department, count: d.count }));
  // SIRs get their own row below (with hours and nonconformances), so
  // they're left out of the general results list when that row shows.
  const results = RESULT_METRICS.filter((m) => stats.results[m.key] > 0 && !(m.key === "sirsCompleted" && stats.sir));

  if (stats.evidenceCount === 0) {
    return (
      <div className="card text-sm text-slate-500 dark:text-slate-400">
        No evidence logged for {stats.scopeLabel} yet - the dashboard fills in as you log entries.
      </div>
    );
  }

  return (
    <div className="print-exact space-y-4 print:space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 print:grid-cols-4">
        <StatTile label="Evidence logged" value={String(stats.evidenceCount)} hint={stats.scopeLabel} />
        <StatTile label="High-impact wins" value={String(stats.impactTotals.high)} />
        <StatTile label="Teams supported" value={String(stats.crossFunctional.length)} />
        <StatTile label="Goals on track" value={`${goalsOnTrack}/${stats.goalProgress.length}`} hint={String(stats.goalYear)} />
      </div>

      {(results.length > 0 || stats.volume || stats.sir) && (
        <section className="card break-inside-avoid">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Measurable results
          </h3>
          <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-5 print:grid-cols-5">
            {stats.volume && (
              <>
                <div>
                  <p className="text-2xl font-bold">{stats.volume.inspected.toLocaleString("en-US")}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Lots inspected (SAP)</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.volume.acceptRate !== null ? `${stats.volume.acceptRate}%` : "-"}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Accept rate (SAP)</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.volume.qnsRaised.toLocaleString("en-US")}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">QNs raised (rejected lots)</p>
                </div>
              </>
            )}
            {results.map((m) => (
              <div key={m.key}>
                <p className="text-2xl font-bold">
                  {m.key === "costAvoided" ? "$" : ""}
                  {stats.results[m.key].toLocaleString("en-US")}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{m.label}</p>
              </div>
            ))}
          </div>
          {stats.sir && (
            <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                First articles (SIRs)
              </p>
              <div className="mt-1 grid grid-cols-3 gap-3">
                {(
                  [
                    ["SIRs completed", stats.sir.completed],
                    ["Hours invested", stats.sir.hours],
                    ["Nonconformances caught", stats.sir.findings],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label}>
                    <p className="text-2xl font-bold">{value.toLocaleString("en-US")}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-2 print:grid-cols-2">
        <section className="card break-inside-avoid">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Where you shine
          </h3>
          <p className="mb-3 text-xs text-slate-400">Evidence by category</p>
          <BarList rows={topStrengths} unit="pieces of evidence" />
        </section>

        <section className="card break-inside-avoid">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Cross-functional reach
          </h3>
          <p className="mb-3 text-xs text-slate-400">Times you supported each team</p>
          {teams.length > 0 ? (
            <BarList rows={teams} unit="times supported" />
          ) : (
            <p className="text-sm text-slate-400">No cross-functional support logged yet.</p>
          )}
        </section>
      </div>

      {stats.monthly.length > 0 && (
        <section className="card break-inside-avoid">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Evidence over time
          </h3>
          <p className="mb-3 text-xs text-slate-400">Pieces of evidence logged per month</p>
          <MonthlyColumns months={stats.monthly} />
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-2 print:grid-cols-2">
        <section className="card break-inside-avoid">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Impact mix
          </h3>
          <ImpactMix totals={stats.impactTotals} />
        </section>

        <section className="card break-inside-avoid">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Goal progress &middot; {stats.goalName}
          </h3>
          <p className="mb-3 text-xs text-slate-400">Current year</p>
          <GoalProgress goals={stats.goalProgress} />
        </section>
      </div>
    </div>
  );
}
