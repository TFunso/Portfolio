import { isSirText } from "@/lib/metrics";
import { monthKey } from "@/lib/volume";

// ---------------------------------------------------------------------------
// First article inspections (SIRs) can be recorded two ways:
//   - in daily entries ("Completed SIR on the new bracket, 6 hours, 2 NCs")
//   - as monthly totals on the Monthly Totals page (bulk entry)
// A month with a monthly total uses that total, and SIR figures from that
// month's daily entries are NOT added on top - they stay in the report as
// examples of the work. Hours or findings left blank in a monthly total fall
// back to that month's entries, so entering only the count doesn't erase
// hours already logged. Months without a total use the daily entries.
// ---------------------------------------------------------------------------

export interface SirMonthTotal {
  year: number;
  month: number; // 1-12
  completed: number;
  hours: number | null;
  findings: number | null;
}

export interface SirEntryFigures {
  recordDate: Date;
  sirsCompleted: number | null;
  hoursSpent: number | null;
  defectsCaught: number | null;
}

export interface SirSummary {
  completed: number;
  hours: number;
  findings: number;
  entries: number; // SIR evidence entries in scope (all shown as examples)
  entriesCounted: number; // of those, entries from months WITHOUT a monthly total
  monthsEntered: number; // months with a monthly total
}

// First article / SIR evidence: the category, an SIR count, or the words in
// the entry itself (covers evidence filed before SIR support existed).
export function isSirRecord(r: { category: string; sirsCompleted: number | null; whatHappened: string }): boolean {
  return r.category === "First Article (SIR)" || (r.sirsCompleted ?? 0) > 0 || isSirText(r.whatHappened);
}

// SIR figures from one month's daily entries.
export interface SirEntryMonth {
  year: number;
  month: number;
  completed: number;
  hours: number;
  findings: number;
  entries: number;
}

// SIR figures from daily entries, grouped by calendar month.
export function sirEntriesByMonth(entries: SirEntryFigures[]): Map<string, SirEntryMonth> {
  const out = new Map<string, SirEntryMonth>();
  for (const e of entries) {
    const year = e.recordDate.getFullYear();
    const month = e.recordDate.getMonth() + 1;
    const key = monthKey(year, month);
    const f = out.get(key) ?? { year, month, completed: 0, hours: 0, findings: 0, entries: 0 };
    f.completed += e.sirsCompleted ?? 0;
    f.hours += e.hoursSpent ?? 0;
    f.findings += e.defectsCaught ?? 0;
    f.entries += 1;
    out.set(key, f);
  }
  return out;
}

const round1 = (v: number) => Math.round(v * 10) / 10;

// The one rule, on per-month figures: a month's total wins over that
// month's entries (blank hours/findings fall back to the entries).
export function combineSirMonths(months: SirMonthTotal[], fromEntries: SirEntryMonth[]): SirSummary {
  const entryMonths = new Map(fromEntries.map((e) => [monthKey(e.year, e.month), e]));
  const totals = new Map(months.map((m) => [monthKey(m.year, m.month), m]));
  let completed = 0;
  let hours = 0;
  let findings = 0;
  let entries = 0;
  let entriesCounted = 0;

  for (const [key, m] of totals) {
    const e = entryMonths.get(key);
    completed += m.completed;
    hours += m.hours ?? e?.hours ?? 0;
    findings += m.findings ?? e?.findings ?? 0;
  }
  for (const [key, e] of entryMonths) {
    entries += e.entries;
    if (totals.has(key)) continue;
    completed += e.completed;
    hours += e.hours;
    findings += e.findings;
    entriesCounted += e.entries;
  }

  return { completed, hours: round1(hours), findings, entries, entriesCounted, monthsEntered: totals.size };
}

export function combineSir(entries: SirEntryFigures[], months: SirMonthTotal[]): SirSummary {
  return combineSirMonths(months, Array.from(sirEntriesByMonth(entries).values()));
}

export function hasSirData(s: SirSummary): boolean {
  return s.entries > 0 || s.monthsEntered > 0;
}

// "From monthly totals for 3 months and 2 logged entries from other months"
export function sirSourceNote(s: SirSummary): string {
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  const parts: string[] = [];
  if (s.monthsEntered > 0) parts.push(`monthly totals for ${plural(s.monthsEntered, "month", "months")}`);
  if (s.entriesCounted > 0) {
    parts.push(`${plural(s.entriesCounted, "logged entry", "logged entries")}${s.monthsEntered > 0 ? " from other months" : ""}`);
  }
  if (parts.length === 0) return s.entries > 0 ? "No SIRs logged as completed yet" : "";
  return `From ${parts.join(" and ")}`;
}
