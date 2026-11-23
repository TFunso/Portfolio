"use client";

import { useCallback, useEffect, useState } from "react";
import { formatDate, formatDateTime } from "@/lib/dates";
import type { GapRequirement, GapStatus } from "@/types";

interface GapCheck {
  id: string;
  jobTitle: string;
  jobDescription: string;
  summary: string;
  requirements: GapRequirement[];
  aiGenerated: boolean;
  evidenceCount: number;
  createdAt: string;
}

// Status palette (reserved good/warning/critical hues), always paired with
// an icon and a word so the verdict never relies on color alone.
const STATUS: Record<GapStatus, { label: string; icon: string; badge: string; bar: string; heading: string; blurb: string }> = {
  missing: {
    label: "Missing",
    icon: "✕",
    badge: "badge-high",
    bar: "bg-red-500 dark:bg-red-400",
    heading: "Gaps to close",
    blurb: "Nothing logged shows these yet - your 90-day focus.",
  },
  thin: {
    label: "Thin",
    icon: "◐",
    badge: "badge-medium",
    bar: "bg-amber-400 dark:bg-amber-300",
    heading: "Thin - strengthen these",
    blurb: "Some evidence, but not enough to make the case on its own.",
  },
  covered: {
    label: "Covered",
    icon: "✓",
    badge: "badge-good",
    bar: "bg-green-600 dark:bg-green-400",
    heading: "Covered - your proof",
    blurb: "Lead with these in the conversation.",
  },
};
const ORDER: GapStatus[] = ["missing", "thin", "covered"];

function StatusBadge({ status }: { status: GapStatus }) {
  const s = STATUS[status];
  return (
    <span className={`badge ${s.badge}`}>
      <span aria-hidden>{s.icon}</span> {s.label}
    </span>
  );
}

function CoverageBar({ requirements }: { requirements: GapRequirement[] }) {
  const total = requirements.length;
  const counts = { covered: 0, thin: 0, missing: 0 } as Record<GapStatus, number>;
  for (const r of requirements) counts[r.status] += 1;
  const segments = (["covered", "thin", "missing"] as GapStatus[]).filter((s) => counts[s] > 0);

  return (
    <div className="print-exact">
      <div className="grid grid-cols-3 gap-3">
        {(["covered", "thin", "missing"] as GapStatus[]).map((s) => (
          <div key={s} className="card break-inside-avoid p-4">
            <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <span aria-hidden>{STATUS[s].icon}</span> {STATUS[s].label}
            </p>
            <p className="mt-1 text-3xl font-bold">{counts[s]}</p>
            <p className="text-xs text-slate-400">of {total} requirements</p>
          </div>
        ))}
      </div>
      <div className="mt-3 flex h-3 gap-[2px] overflow-hidden rounded-full" role="img" aria-label={`${counts.covered} covered, ${counts.thin} thin, ${counts.missing} missing`}>
        {segments.map((s) => (
          <div
            key={s}
            className={STATUS[s].bar}
            style={{ width: `${(counts[s] / total) * 100}%` }}
            title={`${STATUS[s].label}: ${counts[s]}`}
          />
        ))}
      </div>
    </div>
  );
}

function RequirementCard({ req }: { req: GapRequirement }) {
  return (
    <li className="card break-inside-avoid space-y-2.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="font-medium">{req.requirement}</p>
        <StatusBadge status={req.status} />
      </div>
      {req.note && <p className="text-sm text-slate-500 dark:text-slate-400">{req.note}</p>}
      {req.evidence.length > 0 && (
        <ul className="space-y-1.5 border-l-2 border-slate-200 pl-3 dark:border-slate-700">
          {req.evidence.map((e) => (
            <li key={e.id} className="text-sm">
              <span className="mr-1.5 text-xs text-slate-400">{formatDate(e.date)}</span>
              {e.text}
            </li>
          ))}
        </ul>
      )}
      {req.status !== "covered" && req.nextStep && (
        <p className="rounded-xl bg-brand-50 px-3 py-2 text-sm text-brand-800 dark:bg-brand-900/40 dark:text-brand-100">
          <span className="font-semibold">Next 90 days: </span>
          {req.nextStep}
        </p>
      )}
      {req.status === "covered" && req.nextStep && (
        <p className="text-sm text-slate-500 dark:text-slate-400">{req.nextStep}</p>
      )}
    </li>
  );
}

export default function GapCheckPage() {
  const [checks, setChecks] = useState<GapCheck[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [editing, setEditing] = useState(true);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/gap-check");
    if (res.ok) {
      const list: GapCheck[] = (await res.json()).checks;
      setChecks(list);
      if (list[0]) {
        setSelectedId(list[0].id);
        setJobTitle(list[0].jobTitle);
        setJobDescription(list[0].jobDescription);
        setEditing(false);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function run() {
    if (running) return;
    setRunning(true);
    setError(null);
    try {
      const res = await fetch("/api/gap-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobTitle, jobDescription }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.check) {
        setError(data?.error ?? "The check didn't finish - try again in a moment.");
        return;
      }
      setChecks((prev) => [data.check, ...prev]);
      setSelectedId(data.check.id);
      setEditing(false);
    } catch {
      setError("Couldn't reach QCOS - check your connection and try again.");
    } finally {
      setRunning(false);
    }
  }

  const check = checks.find((c) => c.id === selectedId) ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-bold">Promotion Gap Check</h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            Paste the job description for the role you want. See which requirements your evidence already proves - and
            what to work on next.
          </p>
        </div>
        {check && !editing && (
          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary" onClick={() => setEditing(true)}>
              Edit job description
            </button>
            <button className="btn-secondary" disabled={running} onClick={run}>
              {running ? "Checking…" : "Re-run with latest evidence"}
            </button>
            <button className="btn-primary" onClick={() => window.print()}>
              Print / Save PDF
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="card animate-pulse text-sm text-slate-400">Loading…</div>
      ) : (
        <>
          {editing && (
            <section className="card space-y-3 print:hidden">
              <div>
                <label className="text-sm font-medium" htmlFor="job-title">
                  Role you&apos;re going for
                </label>
                <input
                  id="job-title"
                  className="input mt-1"
                  placeholder="e.g. Senior Quality Technician"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium" htmlFor="job-description">
                  Job description
                </label>
                <textarea
                  id="job-description"
                  className="input mt-1 min-h-[220px]"
                  placeholder="Paste the full posting or the internal job description - responsibilities, requirements, qualifications."
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                />
                <p className="mt-1 text-xs text-slate-400">
                  Ask HR or your manager for the internal description of the next level if there&apos;s no posting.
                </p>
              </div>
              {error && <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  className="btn-primary"
                  disabled={running || !jobTitle.trim() || !jobDescription.trim()}
                  onClick={run}
                >
                  {running ? "Checking your evidence…" : "Run gap check"}
                </button>
                {check && (
                  <button className="btn-secondary" disabled={running} onClick={() => setEditing(false)}>
                    Cancel
                  </button>
                )}
                {running && <span className="text-xs text-slate-400">This can take up to a minute.</span>}
              </div>
            </section>
          )}

          {!editing && error && <p className="text-sm font-medium text-red-600 dark:text-red-400 print:hidden">{error}</p>}

          {check ? (
            <article className="space-y-5">
              <header className="card space-y-2">
                <h2 className="text-xl font-bold">Gap Check &middot; {check.jobTitle}</h2>
                <p className="text-xs text-slate-400">
                  Checked {formatDateTime(check.createdAt)} &middot; against {check.evidenceCount} pieces of evidence
                  &middot; {check.aiGenerated ? "AI-mapped" : "Keyword-matched (no AI key configured)"}
                </p>
                <p className="text-sm text-slate-700 dark:text-slate-300">{check.summary}</p>
              </header>

              <CoverageBar requirements={check.requirements} />

              {ORDER.map((status) => {
                const reqs = check.requirements.filter((r) => r.status === status);
                if (reqs.length === 0) return null;
                return (
                  <section key={status} className="space-y-2">
                    <div>
                      <h3 className="font-semibold">
                        {STATUS[status].heading} <span className="font-normal text-slate-400">({reqs.length})</span>
                      </h3>
                      <p className="text-xs text-slate-400">{STATUS[status].blurb}</p>
                    </div>
                    <ul className="space-y-3">
                      {reqs.map((r, i) => (
                        <RequirementCard key={i} req={r} />
                      ))}
                    </ul>
                  </section>
                );
              })}
            </article>
          ) : (
            !editing && <div className="card text-sm text-slate-500">No gap check yet.</div>
          )}

          {checks.length > 1 && (
            <section className="card print:hidden">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Earlier checks
              </h3>
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {checks.map((c) => {
                  const covered = c.requirements.filter((r) => r.status === "covered").length;
                  return (
                    <li key={c.id}>
                      <button
                        className={`flex w-full items-center justify-between gap-2 py-2 text-left text-sm ${c.id === selectedId ? "font-semibold" : ""}`}
                        onClick={() => {
                          setSelectedId(c.id);
                          setJobTitle(c.jobTitle);
                          setJobDescription(c.jobDescription);
                          setEditing(false);
                        }}
                      >
                        <span className="truncate">
                          {c.jobTitle} <span className="font-normal text-slate-400">&middot; {formatDate(c.createdAt)}</span>
                        </span>
                        <span className="shrink-0 text-xs text-slate-500">
                          {covered}/{c.requirements.length} covered
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
