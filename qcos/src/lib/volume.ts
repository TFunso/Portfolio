// ---------------------------------------------------------------------------
// Official inspection volume (SAP): lots inspected / accepted / rejected per
// month. This module is pure (safe in client components): totals, labels,
// and the paste parser that turns rows copied from an SAP export in Excel
// into monthly totals. Daily rows are summed in the browser - only monthly
// totals are ever sent to the server or stored.
// ---------------------------------------------------------------------------

export interface MonthVolume {
  year: number;
  month: number; // 1-12
  inspected: number;
  accepted: number;
  rejected: number;
}

export interface VolumeTotals {
  inspected: number;
  accepted: number;
  rejected: number;
  months: number; // months with data
  // Rates are over lots with a decision (accepted + rejected), so they
  // always add up to 100% even if some inspected lots are still pending.
  acceptRate: number | null; // %, 1 decimal
  rejectRate: number | null; // %, 1 decimal
  // Every rejected lot needs a Quality Notification to disposition it, so
  // QNs raised = lots rejected.
  qnsRaised: number;
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

export function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function monthLabel(year: number, month: number): string {
  const name = MONTHS[month - 1];
  return `${name[0].toUpperCase()}${name.slice(1)} ${year}`;
}

export function totalVolume(rows: MonthVolume[]): VolumeTotals {
  const t = { inspected: 0, accepted: 0, rejected: 0 };
  for (const r of rows) {
    t.inspected += r.inspected;
    t.accepted += r.accepted;
    t.rejected += r.rejected;
  }
  const decided = t.accepted + t.rejected;
  const acceptRate = decided > 0 ? Math.round((t.accepted / decided) * 1000) / 10 : null;
  return {
    ...t,
    months: rows.length,
    acceptRate,
    rejectRate: acceptRate === null ? null : Math.round((100 - acceptRate) * 10) / 10,
    qnsRaised: t.rejected,
  };
}

// Of the QNs raised, how many went through without a clarification request
// - turns the "QN Clarification Requests" goal from a count into a quality
// rate ("98% of QNs right first time").
export function qnFirstTimeRight(qnsRaised: number, clarifications: number): { rate: number; qns: number; clarifications: number } | null {
  if (qnsRaised <= 0) return null;
  const ok = Math.max(0, qnsRaised - clarifications);
  return { rate: Math.round((ok / qnsRaised) * 1000) / 10, qns: qnsRaised, clarifications };
}

export type PartialMonth = { inspected?: number | null; accepted?: number | null; rejected?: number | null };

// Any two of inspected / accepted / rejected give the third:
//   inspected + accepted -> rejected = inspected - accepted
//   inspected + rejected -> accepted = inspected - rejected
//   accepted + rejected  -> inspected = accepted + rejected
// With all three given they're kept as entered (inspected may exceed
// accepted + rejected when some lots are still awaiting a decision).
export function completeMonth(p: PartialMonth): { inspected: number; accepted: number; rejected: number } | string {
  const has = (v: number | null | undefined): v is number => typeof v === "number" && Number.isFinite(v);
  const { inspected, accepted, rejected } = p;
  let full: { inspected: number; accepted: number; rejected: number };
  if (has(inspected) && has(accepted) && has(rejected)) full = { inspected, accepted, rejected };
  else if (has(inspected) && has(accepted)) full = { inspected, accepted, rejected: inspected - accepted };
  else if (has(inspected) && has(rejected)) full = { inspected, accepted: inspected - rejected, rejected };
  else if (has(accepted) && has(rejected)) full = { inspected: accepted + rejected, accepted, rejected };
  else return "enter at least two of inspected, accepted and rejected.";
  return validateMonth(full) ?? full;
}

// Lots mentioned in daily entries, counting only entries from months that
// have NO SAP figure - in SAP-covered months those lots are already inside
// the official total, so adding them would double-count.
export function unitsOutsideSapMonths(
  records: { recordDate: Date; unitsHandled: number | null }[],
  sapMonths: { year: number; month: number }[],
): number {
  const covered = new Set(sapMonths.map((m) => monthKey(m.year, m.month)));
  let total = 0;
  for (const r of records) {
    if (!r.unitsHandled || r.unitsHandled <= 0) continue;
    if (covered.has(monthKey(r.recordDate.getFullYear(), r.recordDate.getMonth() + 1))) continue;
    total += r.unitsHandled;
  }
  return total;
}

// "4,512 lots inspected · 4,380 accepted · 132 rejected (2.9%)"
// "4,764 lots inspected · 4,660 accepted (97.8%) · 104 rejected (2.2%) → 104 QNs raised"
export function formatVolume(t: VolumeTotals): string {
  const n = (v: number) => v.toLocaleString("en-US");
  const pct = (r: number | null) => (r !== null ? ` (${r}%)` : "");
  return `${n(t.inspected)} lots inspected · ${n(t.accepted)} accepted${pct(t.acceptRate)} · ${n(t.rejected)} rejected${pct(t.rejectRate)} → ${n(t.qnsRaised)} QNs raised`;
}

export function validateMonth(v: { inspected: number; accepted: number; rejected: number }): string | null {
  for (const [k, n] of Object.entries(v)) {
    if (!Number.isInteger(n) || n < 0) return `${k} must be a whole number of 0 or more.`;
  }
  if (v.accepted + v.rejected > v.inspected) return "Accepted + rejected can't be more than inspected.";
  return null;
}

// ------------------------------------------------------------ paste parser

// How to read 03/04/2026 - SAP date formats follow the user's settings.
// Dotted dates (04.03.2026) are always day.month.year.
export type SlashDateOrder = "mdy" | "dmy";

function fullYear(y: number): number {
  return y < 100 ? 2000 + y : y;
}

function valid(year: number, month: number, day = 1): { year: number; month: number } | null {
  if (year < 1990 || year > 2200 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month };
}

export function parseDateCell(raw: string, slashOrder: SlashDateOrder = "mdy"): { year: number; month: number } | null {
  const cell = raw.trim().replace(/^"|"$/g, "");
  let m: RegExpExecArray | null;

  if ((m = /^(\d{4})[-/.](\d{1,2})(?:[-/.](\d{1,2}))?$/.exec(cell))) {
    return valid(Number(m[1]), Number(m[2]), m[3] ? Number(m[3]) : 1); // 2026-03-04, 2026-03
  }
  if ((m = /^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/.exec(cell))) {
    return valid(fullYear(Number(m[3])), Number(m[2]), Number(m[1])); // 04.03.2026
  }
  if ((m = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(cell))) {
    let a = Number(m[1]);
    let b = Number(m[2]);
    // an impossible month settles the order regardless of the setting
    const dmy = slashOrder === "dmy" ? b <= 12 || a > 12 : a > 12;
    if (dmy) [a, b] = [b, a];
    return valid(fullYear(Number(m[3])), a, b); // a = month, b = day
  }
  if ((m = /^(\d{1,2})[./](\d{4})$/.exec(cell))) {
    return valid(Number(m[2]), Number(m[1])); // 03/2026, 03.2026
  }
  if ((m = /^([a-z]{3})[a-z]*\.?[\s-]+(\d{2}|\d{4})$/i.exec(cell))) {
    const month = MONTHS.indexOf(m[1].toLowerCase()) + 1;
    return month > 0 ? valid(fullYear(Number(m[2])), month) : null; // Mar 2026, March-26
  }
  return null;
}

export function parseCount(raw: string): number | null {
  const cell = raw.trim().replace(/^"|"$/g, "");
  if (/^\d+$/.test(cell)) return Number(cell);
  // thousands separators: 1,234 / 1.234 / 1 234 (counts are whole numbers)
  if (/^\d{1,3}([,.\s ]\d{3})+$/.test(cell)) return Number(cell.replace(/[,.\s ]/g, ""));
  return null;
}

function splitRow(line: string): string[] {
  if (line.includes("\t")) return line.split("\t");
  if (line.includes(";")) return line.split(";");
  if (/\s{2,}/.test(line.trim())) return line.trim().split(/\s{2,}/);
  return line.split(",");
}

export interface PasteResult {
  months: MonthVolume[];
  rowsUsed: number;
  skipped: { line: number; text: string; reason: string }[];
}

// What two numbers after the date mean (three are always inspected,
// accepted, rejected). The missing one is worked out by completeMonth().
export type TwoColumnLayout = "accepted-rejected" | "inspected-accepted" | "inspected-rejected";

// Each row needs a date, then two or three numbers. Rows without a date -
// headers, blank lines, subtotals - are skipped and reported back.
export function parsePastedVolume(
  text: string,
  slashOrder: SlashDateOrder = "mdy",
  twoColumns: TwoColumnLayout = "accepted-rejected",
): PasteResult {
  const byMonth = new Map<string, MonthVolume>();
  const skipped: PasteResult["skipped"] = [];
  let rowsUsed = 0;

  text.split(/\r?\n/).forEach((line, i) => {
    if (!line.trim()) return;
    const cells = splitRow(line);
    const dateIndex = cells.findIndex((c) => parseDateCell(c, slashOrder) !== null);
    if (dateIndex === -1) {
      skipped.push({ line: i + 1, text: line.slice(0, 80), reason: "no date found" });
      return;
    }
    const date = parseDateCell(cells[dateIndex], slashOrder)!;
    const numbers = cells
      .slice(dateIndex + 1)
      .map(parseCount)
      .filter((n): n is number => n !== null);

    let partial: PartialMonth;
    if (numbers.length >= 3) partial = { inspected: numbers[0], accepted: numbers[1], rejected: numbers[2] };
    else if (numbers.length === 2) {
      const [a, b] = numbers;
      partial =
        twoColumns === "accepted-rejected"
          ? { accepted: a, rejected: b }
          : twoColumns === "inspected-accepted"
            ? { inspected: a, accepted: b }
            : { inspected: a, rejected: b };
    } else {
      skipped.push({ line: i + 1, text: line.slice(0, 80), reason: "needs two or three counts after the date" });
      return;
    }
    const full = completeMonth(partial);
    if (typeof full === "string") {
      skipped.push({ line: i + 1, text: line.slice(0, 80), reason: full.replace(/\.$/, "").toLowerCase() });
      return;
    }
    const { inspected, accepted, rejected } = full;

    const key = monthKey(date.year, date.month);
    const m = byMonth.get(key) ?? { year: date.year, month: date.month, inspected: 0, accepted: 0, rejected: 0 };
    m.inspected += inspected;
    m.accepted += accepted;
    m.rejected += rejected;
    byMonth.set(key, m);
    rowsUsed += 1;
  });

  const months = Array.from(byMonth.values()).sort((a, b) => a.year - b.year || a.month - b.month);
  return { months, rowsUsed, skipped };
}
