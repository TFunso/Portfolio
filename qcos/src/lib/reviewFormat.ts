import { RESULT_METRICS } from "@/lib/metrics";
import type { PeriodSummary } from "@/lib/review";

// Shared wording for the review page and its Word export (client-safe:
// type-only import from the server module).

export function formatResultValue(key: string, n: number): string {
  return key === "costAvoided" ? `$${n.toLocaleString("en-US")}` : n.toLocaleString("en-US");
}

// "(5 in Mid-Year 2025)" - or nothing when the previous period has no data
// at all (e.g. before QCOS was in use), where a comparison would mislead.
export function comparison(previousValue: string, previous: PeriodSummary, previousLabel: string): string {
  return previous.evidence === 0 ? "" : ` (${previousValue} in ${previousLabel})`;
}

export function resultLines(current: PeriodSummary, previous: PeriodSummary, previousLabel: string): string[] {
  // SIRs have their own section, so they're not repeated here.
  return RESULT_METRICS.filter((m) => m.key !== "sirsCompleted" && (current.results[m.key] > 0 || previous.results[m.key] > 0)).map(
    (m) =>
      `${m.label}: ${formatResultValue(m.key, current.results[m.key])}${comparison(formatResultValue(m.key, previous.results[m.key]), previous, previousLabel)}`,
  );
}

export function goalStatusWord(status: string): string {
  return status === "green" ? "on track" : status === "yellow" ? "in progress" : "needs attention";
}

export function goalLine(g: {
  label: string;
  target: number;
  comparator: string;
  periodActual: number;
  ytdActual: number;
  status: string;
}): string {
  const target = g.comparator === "ongoing" ? "" : g.comparator === "max" ? ` (limit ${g.target})` : ` / ${g.target}`;
  return `${g.label}: ${g.ytdActual}${target} year to date, ${g.periodActual} this period - ${goalStatusWord(g.status)}`;
}
