"use client";

import { useEffect, useMemo, useState } from "react";
import { StatusDot } from "@/components/Badges";
import { formatDate } from "@/lib/dates";
import { RESULT_METRICS } from "@/lib/metrics";
import { defaultPeriod, periodParams, toDateInput, type PeriodKind } from "@/lib/periods";
import { formatResultValue, goalStatusWord } from "@/lib/reviewFormat";
import type { PeriodReport } from "@/lib/review";

const SECTION_LABELS: Record<string, string> = {
  crossFunctionalSupport: "Cross-Functional Support",
  leadership: "Leadership",
  knowledgeSharing: "Knowledge Sharing",
  continuousImprovement: "Continuous Improvement",
  goalAchievement: "Goal Achievement",
  other: "Additional Contributions",
};

const PERIOD_OPTIONS: { value: PeriodKind; label: string }[] = [
  { value: "mid-year", label: "Mid-Year (May review)" },
  { value: "year-end", label: "Year-End (January review)" },
  { value: "q1", label: "Q1 (Jan–Mar)" },
  { value: "q2", label: "Q2 (Apr–Jun)" },
  { value: "q3", label: "Q3 (Jul–Sep)" },
  { value: "q4", label: "Q4 (Oct–Dec)" },
  { value: "custom", label: "Custom dates" },
];

const THIS_YEAR = new Date().getFullYear();
const YEARS = [THIS_YEAR, THIS_YEAR - 1, THIS_YEAR - 2, THIS_YEAR - 3];

function Delta({ current, previous, label, noData }: { current: number; previous: number; label: string; noData?: boolean }) {
  const diff = Math.round((current - previous) * 10) / 10;
  const text = noData
    ? `no data for ${label}`
    : diff === 0
      ? `same as ${label}`
      : `${diff > 0 ? "▲" : "▼"} ${Math.abs(diff).toLocaleString("en-US")} vs. ${label}`;
  return <p className="mt-0.5 text-xs text-slate-400">{text}</p>;
}

function Tile({ label, value, children }: { label: string; value: string; children?: React.ReactNode }) {
  return (
    <div className="card break-inside-avoid p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-3xl font-bold">{value}</p>
      {children}
    </div>
  );
}

export default function ReviewPage() {
  const initial = useMemo(() => defaultPeriod(), []);
  const [kind, setKind] = useState<PeriodKind>(initial.kind);
  const [year, setYear] = useState(initial.year);
  const [from, setFrom] = useState(toDateInput(new Date(THIS_YEAR, 0, 1)));
  const [to, setTo] = useState(toDateInput(new Date()));
  const [data, setData] = useState<PeriodReport | null>(null);
  const [loading, setLoading] = useState(true);

  const query = periodParams(kind, year, from, to);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/review?${query}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!cancelled) {
          setData(json);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [query]);

  const prevLabel = data?.previousLabel ?? "";
  const noPrev = (data?.previous.evidence ?? 0) === 0;
  const resultMetrics = data
    ? RESULT_METRICS.filter((m) => data.current.results[m.key] > 0 || data.previous.results[m.key] > 0)
    : [];
  const health = data?.health;
  const healthIssues =
    health &&
    (health.total - health.withResults > 0 ||
      health.monthsWithoutEvidence.length > 0 ||
      health.goalsWithoutEvidence.length > 0 ||
      health.volumeMonthsMissing.length > 0 ||
      (health.total > 0 && health.starred === 0));

  return (
    <div className="space-y-6 print:space-y-4">
      <div className="space-y-3 print:hidden">
        <div>
          <h1 className="text-2xl font-bold">Review Reports</h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            Mid-year, year-end, quarterly or any dates - built only from what you saved, compared with the period before.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select className="input w-auto" value={kind} onChange={(e) => setKind(e.target.value as PeriodKind)} aria-label="Review period">
            {PERIOD_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {kind === "custom" ? (
            <>
              <input type="date" className="input w-auto" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From" />
              <span className="text-sm text-slate-400">to</span>
              <input type="date" className="input w-auto" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To" />
            </>
          ) : (
            <select className="input w-auto" value={year} onChange={(e) => setYear(Number(e.target.value))} aria-label="Year">
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          )}
          <button className="btn-secondary" onClick={() => window.print()}>
            Print / Save PDF
          </button>
          <a className="btn-primary" href={`/api/review/export?${query}`} download>
            Download as Word
          </a>
        </div>
      </div>

      {loading || !data ? (
        <div className="card animate-pulse text-sm text-slate-400">Compiling your report…</div>
      ) : (
        <div className="print-exact space-y-6 print:space-y-4">
          <section className="card">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold">
                {data.period.label} Self Assessment &middot; {data.goal.name}
              </h2>
              {data.period.inProgress && <span className="badge badge-medium">In progress - figures to date</span>}
            </div>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {data.period.reviewNote ?? `${formatDate(data.period.start)} – ${formatDate(data.period.end)}`} &middot; compared
              with {prevLabel}
            </p>
          </section>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 print:grid-cols-4">
            <Tile label="Evidence logged" value={String(data.current.evidence)}>
              <Delta current={data.current.evidence} previous={data.previous.evidence} label={prevLabel} noData={noPrev} />
            </Tile>
            <Tile label="High-impact wins" value={String(data.current.highImpact)}>
              <Delta current={data.current.highImpact} previous={data.previous.highImpact} label={prevLabel} noData={noPrev} />
            </Tile>
            <Tile label="With a measurable result" value={`${data.current.withResults}`}>
              <p className="mt-0.5 text-xs text-slate-400">of {data.current.evidence} pieces of evidence</p>
            </Tile>
            <Tile label="Top wins starred" value={String(data.current.starred)}>
              <p className="mt-0.5 text-xs text-slate-400">lead the report below</p>
            </Tile>
          </div>

          {data.volume && (
            <section className="card break-inside-avoid">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-semibold">Inspection Volume (SAP)</h3>
                <a href="/volume" className="text-xs font-medium text-brand-600 hover:underline print:hidden dark:text-brand-400">
                  Edit SAP figures
                </a>
              </div>
              <p className="text-xs text-slate-400">
                Official monthly totals &middot; {data.volume.months.length} month{data.volume.months.length === 1 ? "" : "s"} in this
                period
              </p>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 print:grid-cols-4">
                <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Lots inspected</p>
                  <p className="mt-0.5 text-2xl font-bold">{data.volume.totals.inspected.toLocaleString("en-US")}</p>
                  <Delta
                    current={data.volume.totals.inspected}
                    previous={data.previousVolume?.inspected ?? 0}
                    label={prevLabel}
                    noData={!data.previousVolume}
                  />
                </div>
                <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Accept rate</p>
                  <p className="mt-0.5 text-2xl font-bold">
                    {data.volume.totals.acceptRate === null ? "-" : `${data.volume.totals.acceptRate}%`}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {data.volume.totals.accepted.toLocaleString("en-US")} accepted &middot;{" "}
                    {data.previousVolume?.acceptRate != null ? `${data.previousVolume.acceptRate}% in ${prevLabel}` : `no data for ${prevLabel}`}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                  <p className="text-xs text-slate-500 dark:text-slate-400">QNs raised</p>
                  <p className="mt-0.5 text-2xl font-bold">{data.volume.totals.qnsRaised.toLocaleString("en-US")}</p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    one per rejected lot &middot; {data.volume.totals.rejectRate ?? 0}% reject rate
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                  <p className="text-xs text-slate-500 dark:text-slate-400">QNs right first time</p>
                  <p className="mt-0.5 text-2xl font-bold">{data.qnQuality ? `${data.qnQuality.rate}%` : "-"}</p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {data.qnQuality
                      ? `${data.qnQuality.clarifications} clarification request${data.qnQuality.clarifications === 1 ? "" : "s"} logged`
                      : "no QNs this period"}
                  </p>
                </div>
              </div>
              {data.volume.months.length > 1 && (
                <ul className="mt-4 space-y-1.5">
                  {data.volume.months.map((m) => {
                    const max = Math.max(1, ...data.volume!.months.map((x) => x.inspected));
                    return (
                      <li key={m.label} className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-2 text-xs" title={`${m.label}: ${m.inspected} inspected, ${m.rejected} rejected`}>
                        <span className="text-slate-500 dark:text-slate-400">{m.label}</span>
                        <span className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                          <span className="block h-2 rounded-full bg-brand-500 dark:bg-brand-400" style={{ width: `${(m.inspected / max) * 100}%` }} />
                        </span>
                        <span className="text-right text-slate-600 dark:text-slate-300">
                          {m.inspected.toLocaleString("en-US")} &middot; {m.rejected.toLocaleString("en-US")} rejected
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
              <p className="mt-3 text-xs text-slate-400">
                Lots mentioned in your daily entries for these months are already inside the SAP totals, so they
                aren&apos;t added again in Measurable Results.
              </p>
            </section>
          )}

          <section className="card break-inside-avoid">
            <h3 className="font-semibold">Measurable Results</h3>
            {resultMetrics.length > 0 ? (
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 print:grid-cols-5">
                {resultMetrics.map((m) => (
                  <div key={m.key} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                    <p className="text-xs text-slate-500 dark:text-slate-400">{m.label}</p>
                    <p className="mt-0.5 text-2xl font-bold">{formatResultValue(m.key, data.current.results[m.key])}</p>
                    <Delta current={data.current.results[m.key]} previous={data.previous.results[m.key]} label={prevLabel} noData={noPrev} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                No measurable results in this period yet. Add them when you log (&ldquo;+ Add result&rdquo;), or in the{" "}
                <a href="/evidence-vault" className="font-medium text-brand-600 hover:underline dark:text-brand-400">
                  Evidence Vault
                </a>{" "}
                - try &ldquo;Find numbers in older entries&rdquo; first.
              </p>
            )}
          </section>

          {healthIssues && health && (
            <section className="card break-inside-avoid border-amber-200 bg-amber-50/50 print:hidden dark:border-amber-900 dark:bg-amber-950/20">
              <h3 className="font-semibold">Strengthen this report before the review</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-300">
                {health.total - health.withResults > 0 && (
                  <li>
                    {health.total - health.withResults} of {health.total} entries have no measurable result. Add hours saved,
                    lots, defects caught, delays or dollars avoided in the{" "}
                    <a href="/evidence-vault" className="font-medium text-brand-600 hover:underline dark:text-brand-400">
                      Evidence Vault
                    </a>
                    .
                  </li>
                )}
                {health.total > 0 && health.starred === 0 && (
                  <li>No top wins starred. Star your 5–10 strongest so they lead the report.</li>
                )}
                {health.monthsWithoutEvidence.length > 0 && (
                  <li>No evidence logged in {health.monthsWithoutEvidence.join(", ")} - anything worth adding from then?</li>
                )}
                {health.goalsWithoutEvidence.length > 0 && (
                  <li>No progress logged yet this year on: {health.goalsWithoutEvidence.join(", ")}.</li>
                )}
                {health.volumeMonthsMissing.length > 0 && (
                  <li>
                    No SAP volume entered for {health.volumeMonthsMissing.join(", ")} -{" "}
                    <a href="/volume" className="font-medium text-brand-600 hover:underline dark:text-brand-400">
                      add it
                    </a>{" "}
                    so the inspection totals are complete.
                  </li>
                )}
              </ul>
            </section>
          )}

          <section className="card">
            <h3 className="font-semibold">Top Wins</h3>
            {data.topWins.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">No evidence logged in this period yet.</p>
            ) : (
              <ol className="mt-3 list-decimal space-y-2.5 pl-5 text-sm">
                {data.topWins.map((w) => (
                  <li key={w.id}>
                    {w.starred && (
                      <span className="mr-1 text-amber-500" title="Top win" aria-label="Top win">
                        ★
                      </span>
                    )}
                    {w.text}
                    {w.result && <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Result: {w.result}</p>}
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="card break-inside-avoid">
            <h3 className="font-semibold">{data.goal.name} Goal Progress</h3>
            <p className="text-xs text-slate-400">Annual targets, judged on the year to date at the end of this period</p>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {data.goals.map((g) => (
                <li
                  key={g.label}
                  className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-800"
                >
                  <span>
                    {g.label}
                    <span className="block text-xs text-slate-400">{g.periodActual} this period</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <StatusDot status={g.status as "green" | "yellow" | "red"} />
                    {goalStatusWord(g.status)} &middot;{" "}
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      {g.ytdActual}
                      {g.comparator === "min" ? ` / ${g.target}` : g.comparator === "max" ? ` (limit ${g.target})` : ""}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {Object.entries(data.sections).map(([key, items]) =>
            items.length === 0 ? null : (
              <section key={key} className="card">
                <h3 className="font-semibold">
                  {SECTION_LABELS[key] ?? key} <span className="font-normal text-slate-400">({items.length})</span>
                </h3>
                <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm">
                  {items.map((i) => (
                    <li key={i.id}>
                      {i.starred && <span className="mr-1 text-amber-500">★</span>}
                      {i.text}
                      {i.result && <span className="text-slate-500 dark:text-slate-400"> - {i.result}</span>}
                    </li>
                  ))}
                </ul>
              </section>
            ),
          )}

          <section className="card break-inside-avoid">
            <h3 className="font-semibold">Promotion Discussion Talking Points</h3>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
              {data.talkingPoints.promotion.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          </section>

          <section className="card break-inside-avoid">
            <h3 className="font-semibold">Raise Discussion Talking Points</h3>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
              {data.talkingPoints.raise.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}
