import { prisma } from "@/lib/prisma";
import { isSirRecord, sirEntriesByMonth, type SirMonthTotal } from "@/lib/sir";
import { monthsInRange } from "@/lib/volumeData";

// Server-side access to monthly SIR totals (see sir.ts for how they combine
// with SIRs logged in daily entries).

const SELECT = { year: true, month: true, completed: true, hours: true, findings: true } as const;

export async function getSirMonthsYear(year: number): Promise<SirMonthTotal[]> {
  return prisma.sirMonth.findMany({ where: { year }, orderBy: { month: "asc" }, select: SELECT });
}

export async function upsertSirMonths(months: SirMonthTotal[]): Promise<number> {
  await prisma.$transaction(
    months.map((m) =>
      prisma.sirMonth.upsert({
        where: { year_month: { year: m.year, month: m.month } },
        update: { completed: m.completed, hours: m.hours, findings: m.findings },
        create: { ...m },
      }),
    ),
  );
  return months.length;
}

export async function deleteSirMonth(year: number, month: number): Promise<void> {
  await prisma.sirMonth.deleteMany({ where: { year, month } });
}

// Monthly totals for the calendar months a date range touches (a range that
// covers part of a month counts that month's whole total, as with SAP).
export async function getSirMonthsForRange(start: Date, end: Date): Promise<SirMonthTotal[]> {
  const wanted = monthsInRange(start, end);
  if (wanted.length === 0) return [];
  return prisma.sirMonth.findMany({
    where: { OR: wanted.map((w) => ({ year: w.year, month: w.month })) },
    orderBy: [{ year: "asc" }, { month: "asc" }],
    select: SELECT,
  });
}

export async function getAllSirMonths(): Promise<SirMonthTotal[]> {
  return prisma.sirMonth.findMany({ orderBy: [{ year: "asc" }, { month: "asc" }], select: SELECT });
}

// What daily entries already say about SIRs in each month of a year - shown
// beside the monthly grid so it's clear what a monthly total replaces.
export async function getSirEntryMonths(year: number) {
  const records = await prisma.evidenceRecord.findMany({
    where: { recordDate: { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) } },
    select: { recordDate: true, category: true, whatHappened: true, sirsCompleted: true, hoursSpent: true, defectsCaught: true },
  });
  const byMonth = sirEntriesByMonth(records.filter(isSirRecord));
  return Array.from(byMonth.values())
    .filter((m) => m.year === year)
    .map((m) => ({ ...m, hours: Math.round(m.hours * 10) / 10 }))
    .sort((a, b) => a.month - b.month);
}
