// ---------------------------------------------------------------------------
// Review periods. The review calendar is fixed: a mid-year review in May
// and a year-end review in January covering the previous calendar year.
//   year-end  Jan 1 - Dec 31          (for the January review the year after)
//   mid-year  Jan 1 - May 31          (for the May review; up to the review)
//   q1..q4    calendar quarters
//   custom    any from/to range
// Each period knows its comparison period (the same period a year/quarter
// earlier, or the equal-length window just before a custom range).
//
// Pure module - safe to import from client components.
// ---------------------------------------------------------------------------

export type PeriodKind = "year-end" | "mid-year" | "q1" | "q2" | "q3" | "q4" | "custom";

export interface Period {
  kind: PeriodKind;
  year: number;
  start: Date; // inclusive
  end: Date; // inclusive (23:59:59.999)
  label: string;
  reviewNote: string | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function endOfDay(y: number, m: number, d: number): Date {
  return new Date(y, m, d, 23, 59, 59, 999);
}

function fmt(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function toDateInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function fromDateInput(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function resolvePeriod(kind: PeriodKind, year: number, from?: string | null, to?: string | null): Period {
  switch (kind) {
    case "year-end":
      return {
        kind,
        year,
        start: new Date(year, 0, 1),
        end: endOfDay(year, 11, 31),
        label: `Year-End ${year}`,
        reviewNote: `For the January ${year + 1} review · Jan 1 – Dec 31, ${year}`,
      };
    case "mid-year":
      return {
        kind,
        year,
        start: new Date(year, 0, 1),
        end: endOfDay(year, 4, 31),
        label: `Mid-Year ${year}`,
        reviewNote: `For the May ${year} review · Jan 1 – May 31, ${year}`,
      };
    case "q1":
    case "q2":
    case "q3":
    case "q4": {
      const q = Number(kind[1]) - 1;
      const start = new Date(year, q * 3, 1);
      const end = endOfDay(year, q * 3 + 3, 0);
      return { kind, year, start, end, label: `Q${q + 1} ${year}`, reviewNote: `${fmt(start)} – ${fmt(end)}` };
    }
    case "custom": {
      const s = (from && fromDateInput(from)) || new Date(year, 0, 1);
      const eDay = (to && fromDateInput(to)) || new Date();
      const [start, endDate] = s <= eDay ? [s, eDay] : [eDay, s];
      const end = endOfDay(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
      return { kind, year: start.getFullYear(), start, end, label: `${fmt(start)} – ${fmt(end)}`, reviewNote: null };
    }
  }
}

export function previousPeriod(p: Period): Period {
  switch (p.kind) {
    case "year-end":
    case "mid-year":
      return resolvePeriod(p.kind, p.year - 1);
    case "q1":
      return resolvePeriod("q4", p.year - 1);
    case "q2":
    case "q3":
    case "q4":
      return resolvePeriod(`q${Number(p.kind[1]) - 1}` as PeriodKind, p.year);
    case "custom": {
      // Calendar-day arithmetic (not millisecond math) so a window that
      // crosses a daylight-saving change still comes out the same length.
      const utcDay = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY_MS;
      const spanDays = utcDay(p.end) - utcDay(p.start); // 0 for a single-day range
      const prevEnd = new Date(p.start.getFullYear(), p.start.getMonth(), p.start.getDate() - 1);
      const prevStart = new Date(prevEnd.getFullYear(), prevEnd.getMonth(), prevEnd.getDate() - spanDays);
      return resolvePeriod("custom", prevStart.getFullYear(), toDateInput(prevStart), toDateInput(prevEnd));
    }
  }
}

export function isInProgress(p: Period, now = new Date()): boolean {
  return p.end.getTime() > now.getTime() && p.start.getTime() <= now.getTime();
}

// What to show by default, given the review calendar: January -> last year's
// year-end (the review is now); February-May -> this year's mid-year;
// June-December -> this year's year-end, to date.
export function defaultPeriod(now = new Date()): { kind: PeriodKind; year: number } {
  const m = now.getMonth();
  if (m === 0) return { kind: "year-end", year: now.getFullYear() - 1 };
  if (m <= 4) return { kind: "mid-year", year: now.getFullYear() };
  return { kind: "year-end", year: now.getFullYear() };
}

const KINDS: PeriodKind[] = ["year-end", "mid-year", "q1", "q2", "q3", "q4", "custom"];

export function parsePeriodParams(params: URLSearchParams): Period {
  const fallback = defaultPeriod();
  const kindParam = params.get("period") as PeriodKind | null;
  const kind = kindParam && KINDS.includes(kindParam) ? kindParam : fallback.kind;
  const yearNum = Number(params.get("year"));
  const year = Number.isInteger(yearNum) && yearNum > 1990 && yearNum < 2200 ? yearNum : fallback.year;
  return resolvePeriod(kind, year, params.get("from"), params.get("to"));
}

export function periodParams(kind: PeriodKind, year: number, from?: string, to?: string): string {
  const params = new URLSearchParams({ period: kind, year: String(year) });
  if (kind === "custom") {
    if (from) params.set("from", from);
    if (to) params.set("to", to);
  }
  return params.toString();
}
