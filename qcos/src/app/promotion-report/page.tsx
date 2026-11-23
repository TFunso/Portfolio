"use client";

import { useCallback, useEffect, useState } from "react";
import { parsePromotionReportSections } from "@/lib/promotionReportFormat";
import { formatDateTime } from "@/lib/dates";
import PromotionDashboard from "@/components/PromotionDashboard";
import type { PromotionStats } from "@/lib/promotionReport";

interface Report {
  id: string;
  scope: string;
  scopeLabel: string;
  content: string;
  aiGenerated: boolean;
  evidenceCount: number;
  generatedAt: string;
}

const CURRENT_YEAR = new Date().getFullYear();
const SCOPE_OPTIONS = [
  { value: "all-time", label: "All-Time" },
  { value: String(CURRENT_YEAR), label: String(CURRENT_YEAR) },
  { value: String(CURRENT_YEAR - 1), label: String(CURRENT_YEAR - 1) },
  { value: String(CURRENT_YEAR - 2), label: String(CURRENT_YEAR - 2) },
];

export default function PromotionReportPage() {
  const [scopeValue, setScopeValue] = useState("all-time");
  const [report, setReport] = useState<Report | null>(null);
  const [stats, setStats] = useState<PromotionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const scopeParams = useCallback(() => {
    const params = new URLSearchParams();
    if (scopeValue === "all-time") {
      params.set("scope", "all-time");
    } else {
      params.set("scope", "year");
      params.set("year", scopeValue);
    }
    return params;
  }, [scopeValue]);

  const load = useCallback(async () => {
    setLoading(true);
    const query = scopeParams().toString();
    const [reportRes, statsRes] = await Promise.all([
      fetch(`/api/promotion-report?${query}`),
      fetch(`/api/promotion-report/stats?${query}`),
    ]);
    if (reportRes.ok) setReport((await reportRes.json()).report);
    if (statsRes.ok) setStats((await statsRes.json()).stats);
    setLoading(false);
  }, [scopeParams]);

  useEffect(() => {
    load();
  }, [load]);

  async function generate() {
    setGenerating(true);
    try {
      const body = scopeValue === "all-time" ? { scope: "all-time" } : { scope: "year", year: Number(scopeValue) };
      const res = await fetch("/api/promotion-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) setReport((await res.json()).report);
    } finally {
      setGenerating(false);
    }
  }

  const sections = report ? parsePromotionReportSections(report.content) : [];
  const exportHref =
    scopeValue === "all-time"
      ? "/api/promotion-report/export?scope=all-time"
      : `/api/promotion-report/export?scope=year&year=${scopeValue}`;

  return (
    <div className="space-y-6 print:space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-bold">Promotion Report</h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            A one-page case built from everything you&apos;ve logged - ready for your manager.{" "}
            <a href="/gap-check" className="font-medium text-brand-600 hover:underline dark:text-brand-400">
              Check it against the job description &rarr;
            </a>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select className="input w-auto" value={scopeValue} onChange={(e) => setScopeValue(e.target.value)}>
            {SCOPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <button className="btn-secondary" disabled={generating} onClick={generate}>
            {generating ? "Generating…" : report ? "Regenerate" : "Generate"}
          </button>
          {(report || (stats && stats.evidenceCount > 0)) && (
            <button className="btn-secondary" onClick={() => window.print()}>
              Print / Save PDF
            </button>
          )}
          {report && (
            <a className="btn-primary" href={exportHref} download>
              Download as Word
            </a>
          )}
        </div>
      </div>

      {loading ? (
        <div className="card animate-pulse text-sm text-slate-400">Loading…</div>
      ) : (
        <>
          {stats && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold print:text-base">At a Glance &middot; {stats.scopeLabel}</h2>
              <PromotionDashboard stats={stats} />
            </section>
          )}

          {!report ? (
            <div className="card text-sm text-slate-500 dark:text-slate-400 print:hidden">
              No written report yet for this scope. Click &ldquo;Generate&rdquo; above - it pulls from everything
              already saved in your Evidence Vault, so it only takes a moment.
            </div>
          ) : (
        <article className="card mx-auto max-w-3xl space-y-5 print:break-before-page print:border-none print:shadow-none">
          <header className="border-b border-slate-200 pb-3 dark:border-slate-800">
            <h2 className="text-xl font-bold">Promotion Case &middot; {report.scopeLabel}</h2>
            <p className="mt-1 text-xs text-slate-400">
              Generated {formatDateTime(report.generatedAt)} &middot; {report.evidenceCount} pieces of evidence &middot;{" "}
              {report.aiGenerated ? "AI-written narrative" : "Compiled summary (no AI key configured)"}
            </p>
            {stats && stats.evidenceCount !== report.evidenceCount && (
              <p className="mt-2 text-xs font-medium text-brand-600 dark:text-brand-300 print:hidden">
                You&apos;ve logged more since this was written ({stats.evidenceCount} pieces now) - click
                &ldquo;Regenerate&rdquo; to include them.
              </p>
            )}
          </header>

          {sections.map((section, i) => (
            <section key={i}>
              {section.heading && <h3 className="font-semibold">{section.heading}</h3>}
              <div className="mt-1.5 space-y-1.5 text-sm text-slate-700 dark:text-slate-300">
                {section.lines.map((line, j) =>
                  line.bullet ? (
                    <p key={j} className="pl-4 before:mr-2 before:content-['•']">
                      {line.text}
                    </p>
                  ) : (
                    <p key={j}>{line.text}</p>
                  ),
                )}
              </div>
            </section>
          ))}
        </article>
          )}
        </>
      )}
    </div>
  );
}
