import Link from "next/link";
import { ImpactBadge, CategoryBadge } from "@/components/Badges";
import { formatDate } from "@/lib/dates";

export interface EvidenceHighlight {
  id: string;
  whatHappened: string;
  category: string;
  impactLevel: string;
  recordDate: string;
}

export default function EvidenceHighlights({ records }: { records: EvidenceHighlight[] }) {
  return (
    <section className="card">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Evidence Vault Highlights
        </h2>
        <Link href="/evidence-vault" className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-400">
          View all →
        </Link>
      </div>
      {records.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
          High-impact entries you log will automatically be filed here.
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {records.map((r) => (
            <li key={r.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
              <p className="text-sm font-medium">{r.whatHappened}</p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <ImpactBadge level={r.impactLevel} />
                <CategoryBadge category={r.category} />
                <span className="text-xs text-slate-400">{formatDate(r.recordDate)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
