"use client";

import { useCallback, useEffect, useState } from "react";
import { StatusDot } from "@/components/Badges";

interface ReviewData {
  year: number;
  goal: { name: string; objectives: string[] };
  totalEvidenceCount: number;
  goalAchievementSummary: {
    label: string;
    target: number;
    comparator: string;
    actual: number;
    status: "green" | "yellow" | "red";
  }[];
  topAccomplishments: { id: string; whatHappened: string; suggestedReviewLanguage: string; impactLevel: string }[];
  sections: Record<
    string,
    { id: string; whatHappened: string; suggestedReviewLanguage: string; impactLevel: string }[]
  >;
  talkingPoints: { promotion: string[]; raise: string[] };
}

const SECTION_LABELS: Record<string, string> = {
  crossFunctionalSupport: "Cross-Functional Support Summary",
  leadership: "Leadership Examples",
  knowledgeSharing: "Knowledge Sharing Examples",
  continuousImprovement: "Continuous Improvement Summary",
  goalAchievement: "Goal Achievement Detail",
  other: "Additional Evidence-Based Contributions",
};

export default function ReviewPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [data, setData] = useState<ReviewData | null>(null);
  const [loading, setLoading] = useState(false);

  const generate = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/review?year=${year}`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, [year]);

  useEffect(() => {
    generate();
  }, [generate]);

  return (
    <div className="space-y-6 print:space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-bold">Year-End Self Assessment</h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            Built only from what you saved in QCOS - nothing fabricated.
          </p>
        </div>
        <div className="flex gap-2">
          <select className="input w-auto" value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {[year - 1, year, year + 1].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <button className="btn-secondary" onClick={() => window.print()}>
            Print / Save PDF
          </button>
        </div>
      </div>

      {loading || !data ? (
        <div className="card animate-pulse text-sm text-slate-400">Compiling your year…</div>
      ) : (
        <div className="space-y-6">
          <section className="card">
            <h2 className="text-lg font-bold">
              {data.year} Self Assessment - {data.goal.name}
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {data.totalEvidenceCount} pieces of evidence logged this year.
            </p>
          </section>

          <section className="card">
            <h3 className="font-semibold">Goal Achievement Summary</h3>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {data.goalAchievementSummary.map((g) => (
                <li key={g.label} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-800">
                  <span>{g.label}</span>
                  <span className="flex items-center gap-2">
                    {g.actual}
                    {g.comparator !== "ongoing" ? ` / ${g.comparator === "max" ? `<${g.target + 1}` : g.target}` : ""}
                    <StatusDot status={g.status} />
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="card">
            <h3 className="font-semibold">Top Accomplishments</h3>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm">
              {data.topAccomplishments.map((r) => (
                <li key={r.id}>{r.suggestedReviewLanguage}</li>
              ))}
            </ol>
          </section>

          {Object.entries(data.sections).map(([key, records]) =>
            records.length === 0 ? null : (
              <section key={key} className="card">
                <h3 className="font-semibold">{SECTION_LABELS[key] ?? key}</h3>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
                  {records.map((r) => (
                    <li key={r.id}>{r.suggestedReviewLanguage}</li>
                  ))}
                </ul>
              </section>
            ),
          )}

          <section className="card">
            <h3 className="font-semibold">Promotion Discussion Talking Points</h3>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
              {data.talkingPoints.promotion.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          </section>

          <section className="card">
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
