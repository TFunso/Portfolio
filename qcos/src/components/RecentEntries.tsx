import { ImpactBadge } from "@/components/Badges";
import { formatDateTime } from "@/lib/dates";

export interface RecentEntry {
  id: string;
  content: string;
  entryDate: string;
  classification?: { counts: boolean; impactLevel: string } | null;
}

export default function RecentEntries({ entries }: { entries: RecentEntry[] }) {
  return (
    <section className="card">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Recent Daily Entries
      </h2>
      {entries.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
          No entries yet. Use the box above to log your first one.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-200 dark:divide-slate-800">
          {entries.map((entry) => (
            <li key={entry.id} className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
              <div>
                <p className="text-sm">{entry.content}</p>
                <p className="mt-0.5 text-xs text-slate-400">{formatDateTime(entry.entryDate)}</p>
              </div>
              {entry.classification && <ImpactBadge level={entry.classification.impactLevel} />}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
