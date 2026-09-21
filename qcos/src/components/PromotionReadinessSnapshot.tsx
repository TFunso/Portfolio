interface Props {
  score: number;
  label: string;
  goalsOnTrack: number;
  goalsTotal: number;
  evidenceCountThisYear: number;
  highImpactCount: number;
}

export default function PromotionReadinessSnapshot({
  score,
  label,
  goalsOnTrack,
  goalsTotal,
  evidenceCountThisYear,
  highImpactCount,
}: Props) {
  const color = score >= 75 ? "text-status-green" : score >= 45 ? "text-status-yellow" : "text-status-red";
  const ring = score >= 75 ? "stroke-status-green" : score >= 45 ? "stroke-status-yellow" : "stroke-status-red";
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (score / 100) * circumference;

  return (
    <section className="card flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="relative h-24 w-24 shrink-0">
        <svg viewBox="0 0 100 100" className="h-24 w-24 -rotate-90">
          <circle cx="50" cy="50" r="40" strokeWidth="10" className="fill-none stroke-slate-200 dark:stroke-slate-800" />
          <circle
            cx="50"
            cy="50"
            r="40"
            strokeWidth="10"
            strokeLinecap="round"
            className={`fill-none ${ring}`}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-xl font-bold ${color}`}>{score}</span>
        </div>
      </div>
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Promotion Readiness Snapshot
        </h2>
        <p className="mt-0.5 text-lg font-semibold">{label}</p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {goalsOnTrack}/{goalsTotal} annual goal metrics on track &middot; {evidenceCountThisYear} pieces of evidence
          banked this year &middot; {highImpactCount} high-impact leadership/cross-functional wins
        </p>
      </div>
    </section>
  );
}
