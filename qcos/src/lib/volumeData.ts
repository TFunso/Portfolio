import { prisma } from "@/lib/prisma";
import { monthLabel, totalVolume, type MonthVolume, type VolumeTotals } from "@/lib/volume";

// Server-side access to the monthly SAP inspection volume (see volume.ts).

export async function getVolumeYear(year: number): Promise<MonthVolume[]> {
  return prisma.inspectionVolume.findMany({
    where: { year },
    orderBy: { month: "asc" },
    select: { year: true, month: true, inspected: true, accepted: true, rejected: true },
  });
}

export async function upsertVolumeMonths(months: MonthVolume[]): Promise<number> {
  await prisma.$transaction(
    months.map((m) =>
      prisma.inspectionVolume.upsert({
        where: { year_month: { year: m.year, month: m.month } },
        update: { inspected: m.inspected, accepted: m.accepted, rejected: m.rejected },
        create: { ...m },
      }),
    ),
  );
  return months.length;
}

export async function deleteVolumeMonth(year: number, month: number): Promise<void> {
  await prisma.inspectionVolume.deleteMany({ where: { year, month } });
}

// Calendar months a date range touches, excluding months that haven't
// started yet. Monthly totals can't be split, so a custom range that covers
// part of a month counts that whole month.
export function monthsInRange(start: Date, end: Date, now = new Date()): { year: number; month: number }[] {
  const out: { year: number; month: number }[] = [];
  const last = end < now ? end : now;
  for (let d = new Date(start.getFullYear(), start.getMonth(), 1); d <= last; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
    out.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
  }
  return out;
}

export interface PeriodVolume {
  totals: VolumeTotals;
  months: (MonthVolume & { label: string })[];
  missing: string[]; // completed months in the period with no SAP figure
}

// Volume for a date range, or null when no SAP volume has ever been entered
// (so reports don't nag about a feature that isn't being used).
export async function getVolumeForRange(start: Date, end: Date): Promise<PeriodVolume | null> {
  const first = await prisma.inspectionVolume.findFirst({ orderBy: [{ year: "asc" }, { month: "asc" }] });
  if (!first) return null;

  const wanted = monthsInRange(start, end);
  if (wanted.length === 0) return { totals: totalVolume([]), months: [], missing: [] };

  const rows = await prisma.inspectionVolume.findMany({
    where: { OR: wanted.map((w) => ({ year: w.year, month: w.month })) },
    orderBy: [{ year: "asc" }, { month: "asc" }],
  });
  const have = new Set(rows.map((r) => `${r.year}-${r.month}`));
  const now = new Date();
  const firstKey = first.year * 12 + first.month;
  const missing = wanted
    .filter((w) => !have.has(`${w.year}-${w.month}`))
    // don't flag the month in progress, or months before SAP entry began
    .filter((w) => !(w.year === now.getFullYear() && w.month === now.getMonth() + 1))
    .filter((w) => w.year * 12 + w.month >= firstKey)
    .map((w) => monthLabel(w.year, w.month));

  const months = rows.map((r) => ({
    year: r.year,
    month: r.month,
    inspected: r.inspected,
    accepted: r.accepted,
    rejected: r.rejected,
    label: monthLabel(r.year, r.month),
  }));
  return { totals: totalVolume(months), months, missing };
}

export async function getAllTimeVolume(): Promise<{ totals: VolumeTotals; months: MonthVolume[] } | null> {
  const months = await prisma.inspectionVolume.findMany({
    select: { year: true, month: true, inspected: true, accepted: true, rejected: true },
  });
  return months.length > 0 ? { totals: totalVolume(months), months } : null;
}
