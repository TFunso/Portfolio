import { prisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth, MONTH_NAMES } from "@/lib/dates";
import { GOAL_METRICS } from "@/lib/goals";
import type { GoalMetricKey } from "@/types";
import type { Prisma } from "@prisma/client";

export interface KpiTrendPoint {
  monthKey: string; // "2026-05"
  monthLabel: string; // "May"
  captured: number; // auto-detected from a daily entry (GoalMetricEvent.entryId set)
  reported: number; // manually logged (GoalMetricEvent.entryId null)
  total: number;
}

// Monthly trend of DRIVE EFFICIENCY goal-metric events, split by how each
// one was logged: "captured" means the classifier detected it from a daily
// entry (GoalMetricEvent.entryId is set); "reported" means it was logged by
// hand, either from the Goal Dashboard's "+ Log one manually" button or a
// This Week's Patterns suggestion (GoalMetricEvent.entryId is null either
// way - there's no further distinction between those two manual paths).
export async function getKpiTrend(months: number, metricKey?: GoalMetricKey): Promise<KpiTrendPoint[]> {
  const now = new Date();
  const points: { monthKey: string; monthLabel: string; start: Date; end: Date }[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const ref = new Date(now.getFullYear(), now.getMonth() - i, 1);
    points.push({
      monthKey: `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, "0")}`,
      monthLabel: MONTH_NAMES[ref.getMonth()].slice(0, 3),
      start: startOfMonth(ref),
      end: endOfMonth(ref),
    });
  }

  const where: Prisma.GoalMetricEventWhereInput = {
    eventDate: { gte: points[0].start, lte: points[points.length - 1].end },
  };
  if (metricKey) where.metricKey = metricKey;

  const events = await prisma.goalMetricEvent.findMany({
    where,
    select: { eventDate: true, entryId: true },
  });

  return points.map(({ monthKey, monthLabel, start, end }) => {
    let captured = 0;
    let reported = 0;
    for (const e of events) {
      if (e.eventDate < start || e.eventDate > end) continue;
      if (e.entryId) captured++;
      else reported++;
    }
    return { monthKey, monthLabel, captured, reported, total: captured + reported };
  });
}

export const KPI_TREND_METRIC_OPTIONS = GOAL_METRICS.map((m) => ({ key: m.key, label: m.label }));
