import { prisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth, startOfQuarter, startOfYear, endOfYear } from "@/lib/dates";
import { fromJson } from "@/lib/json";
import { GOAL_METRICS, goalMetricStatus } from "@/lib/goals";
import type { Category, Department } from "@/types";

export interface ManagerPrepHighlight {
  text: string;
  businessImpact: string;
  impactLevel: string;
  category: string;
}

export interface ManagerPrepGoalRow {
  label: string;
  actual: number;
  target: number;
  comparator: string;
  status: string;
}

export interface ManagerPrepData {
  periodLabel: string;
  highlights: ManagerPrepHighlight[];
  crossFunctional: { department: string; count: number }[];
  goalProgress: ManagerPrepGoalRow[];
}

function impactRank(level: string): number {
  return level === "High" ? 3 : level === "Medium" ? 2 : 1;
}

// Builds a manager-ready 1:1 prep summary: this period's highlights (sorted
// by impact), who you supported cross-functionally this period, and your
// year-to-date progress against the DRIVE EFFICIENCY goals. Scoped to a
// month or quarter rather than the whole year, since a 1:1 is about recent
// work - for the full year, use the December Review Generator instead.
export async function getManagerPrepData(
  periodType: "month" | "quarter",
  year: number,
  month?: number,
): Promise<ManagerPrepData> {
  const now = new Date();
  let rangeStart: Date;
  let rangeEnd: Date;
  let periodLabel: string;

  if (periodType === "month") {
    const ref = new Date(year, (month ?? now.getMonth() + 1) - 1, 1);
    rangeStart = startOfMonth(ref);
    rangeEnd = endOfMonth(ref);
    periodLabel = ref.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  } else {
    const ref = new Date(year, now.getMonth(), 1);
    rangeStart = startOfQuarter(ref);
    rangeEnd = new Date(rangeStart.getFullYear(), rangeStart.getMonth() + 3, 0, 23, 59, 59, 999);
    const quarterNumber = Math.floor(rangeStart.getMonth() / 3) + 1;
    periodLabel = `Q${quarterNumber} ${rangeStart.getFullYear()}`;
  }

  const yearRange = { gte: startOfYear(now), lte: endOfYear(now) };

  const [records, classifications, goalEvents] = await Promise.all([
    prisma.evidenceRecord.findMany({
      where: { recordDate: { gte: rangeStart, lte: rangeEnd } },
      orderBy: { recordDate: "asc" },
    }),
    prisma.classification.findMany({
      where: {
        entry: { entryDate: { gte: rangeStart, lte: rangeEnd } },
        categories: { contains: "Cross-Functional Support" },
      },
    }),
    prisma.goalMetricEvent.findMany({ where: { eventDate: yearRange } }),
  ]);

  const highlights: ManagerPrepHighlight[] = [...records]
    .sort((a, b) => impactRank(b.impactLevel) - impactRank(a.impactLevel))
    .map((r) => ({
      text: r.suggestedReviewLanguage || r.whatHappened,
      businessImpact: r.businessImpact,
      impactLevel: r.impactLevel,
      category: r.category,
    }));

  const deptCounts = new Map<Department, number>();
  for (const c of classifications) {
    const categories = fromJson<Category>(c.categories);
    if (!categories.includes("Cross-Functional Support")) continue;
    const depts = fromJson<Department>(c.departments);
    for (const d of depts.length > 0 ? depts : (["Operations"] as Department[])) {
      deptCounts.set(d, (deptCounts.get(d) ?? 0) + 1);
    }
  }
  const crossFunctional = Array.from(deptCounts.entries())
    .map(([department, count]) => ({ department, count }))
    .sort((a, b) => b.count - a.count);

  const goalCounts = new Map<string, number>();
  for (const e of goalEvents) goalCounts.set(e.metricKey, (goalCounts.get(e.metricKey) ?? 0) + 1);
  const goalProgress: ManagerPrepGoalRow[] = GOAL_METRICS.map((m) => {
    const actual = goalCounts.get(m.key) ?? 0;
    return { label: m.label, actual, target: m.target, comparator: m.comparator, status: goalMetricStatus(m, actual) };
  });

  return { periodLabel, highlights, crossFunctional, goalProgress };
}
