import { ImpactBadge, CategoryBadge } from "@/components/Badges";
import { formatDate } from "@/lib/dates";

export interface CountedThing {
  id: string;
  content: string;
  reason: string;
  impactLevel: string;
  categories: string[];
  entryDate: string;
}

export default function ThingsThatCounted({ items }: { items: CountedThing[] }) {
  return (
    <section className="card">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Things You Did That Counted This Week
      </h2>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
          Nothing logged this week yet. Whatever you did today counts as a start.
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {items.map((item) => (
            <li key={item.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium">
                  <span className="mr-1 text-status-green">✓</span>
                  {item.content}
                </p>
                <span className="whitespace-nowrap text-xs text-slate-400">{formatDate(item.entryDate)}</span>
              </div>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                <span className="font-medium text-slate-600 dark:text-slate-300">Why it counted: </span>
                {item.reason}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <ImpactBadge level={item.impactLevel} />
                {item.categories.map((c) => (
                  <CategoryBadge key={c} category={c} />
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
