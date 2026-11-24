import { prisma } from "@/lib/prisma";
import { fromJson, toJson } from "@/lib/json";
import { DEFAULT_GOAL_SET, type GoalMetricDefinition, type GoalSet } from "@/lib/goals";

// Server-side access to the per-year goals (see goals.ts for the model).

export type GoalSetSource = "saved" | "carried-over" | "default";

export interface ResolvedGoalSet extends GoalSet {
  year: number;
  source: GoalSetSource;
  fromYear: number | null; // for carried-over: the year it came from
}

function hydrate(row: { name: string; objectives: string; metrics: string }): GoalSet {
  return {
    name: row.name,
    objectives: fromJson<string>(row.objectives),
    metrics: fromJson<GoalMetricDefinition>(row.metrics).map((m) => ({ ...m, keywords: m.keywords ?? [] })),
  };
}

// The goals that apply to a year: that year's saved set, else the most
// recent earlier saved set (goals carry over until changed), else the
// built-in default.
export async function getGoalSet(year: number): Promise<ResolvedGoalSet> {
  const row =
    (await prisma.goalYear.findUnique({ where: { year } })) ??
    (await prisma.goalYear.findFirst({ where: { year: { lt: year } }, orderBy: { year: "desc" } }));
  if (!row) return { ...DEFAULT_GOAL_SET, year, source: "default", fromYear: null };
  return {
    ...hydrate(row),
    year,
    source: row.year === year ? "saved" : "carried-over",
    fromYear: row.year === year ? null : row.year,
  };
}

export async function getCurrentGoalSet(): Promise<ResolvedGoalSet> {
  return getGoalSet(new Date().getFullYear());
}

export async function saveGoalSet(year: number, set: GoalSet): Promise<ResolvedGoalSet> {
  const data = { name: set.name.trim(), objectives: toJson(set.objectives), metrics: toJson(set.metrics) };
  await prisma.goalYear.upsert({ where: { year }, update: data, create: { year, ...data } });
  return getGoalSet(year);
}

export async function savedGoalYears(): Promise<number[]> {
  const rows = await prisma.goalYear.findMany({ select: { year: true }, orderBy: { year: "asc" } });
  return rows.map((r) => r.year);
}
