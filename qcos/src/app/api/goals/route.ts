import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { goalMetricStatus, forecastGoalMetric, makeGoalKey, validateGoalSet, type GoalSet } from "@/lib/goals";
import { getCurrentGoalSet, getGoalSet, saveGoalSet, savedGoalYears } from "@/lib/goalStore";
import { startOfYear, endOfYear } from "@/lib/dates";
import type { GoalMetricStatus } from "@/types";

export const dynamic = "force-dynamic";

function parseYear(value: string | null): number {
  const year = Number(value ?? new Date().getFullYear());
  return Number.isInteger(year) && year > 1990 && year < 2200 ? year : new Date().getFullYear();
}

// GET /api/goals?year=2027 - that year's goals (saved, carried over, or the
// built-in default) with actuals against each target.
export async function GET(req: NextRequest) {
  const year = parseYear(req.nextUrl.searchParams.get("year"));
  const ref = new Date(year, 0, 1);
  const [goalSet, events, savedYears] = await Promise.all([
    getGoalSet(year),
    prisma.goalMetricEvent.findMany({ where: { eventDate: { gte: startOfYear(ref), lte: endOfYear(ref) } } }),
    savedGoalYears(),
  ]);

  const counts = new Map<string, number>();
  for (const e of events) counts.set(e.metricKey, (counts.get(e.metricKey) ?? 0) + 1);

  const metrics: GoalMetricStatus[] = goalSet.metrics.map((m) => {
    const actual = counts.get(m.key) ?? 0;
    const { projected, paceStatus } = forecastGoalMetric(m, actual);
    return {
      key: m.key,
      label: m.label,
      description: m.description,
      target: m.target,
      comparator: m.comparator,
      actual,
      status: goalMetricStatus(m, actual),
      projected,
      paceStatus,
    };
  });

  return NextResponse.json({
    year,
    goal: { name: goalSet.name, objectives: goalSet.objectives },
    source: goalSet.source,
    fromYear: goalSet.fromYear,
    definitions: goalSet.metrics,
    savedYears,
    metrics,
    summary: { onTrack: metrics.filter((m) => m.status === "green").length, total: metrics.length },
  });
}

const logSchema = z.object({
  metricKey: z.string().trim().min(1),
  note: z.string().trim().optional(),
});

// POST /api/goals - manually log a goal event (e.g. a No Inspect candidate
// the classifier didn't catch from free text). The goal must be one of the
// current year's goals.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = logSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const goals = await getCurrentGoalSet();
  if (!goals.metrics.some((m) => m.key === parsed.data.metricKey)) {
    return NextResponse.json({ error: "That isn't one of this year's goals." }, { status: 400 });
  }
  const event = await prisma.goalMetricEvent.create({ data: parsed.data });
  return NextResponse.json({ event }, { status: 201 });
}

const metricSchema = z.object({
  key: z.string().trim().optional(), // existing goals keep their id; new ones get one
  label: z.string().trim().min(1, "Every target needs a name.").max(120),
  target: z.number().int().min(0).max(1_000_000),
  comparator: z.enum(["min", "max", "ongoing"]),
  description: z.string().trim().max(500).default(""),
  keywords: z.array(z.string().trim().min(1).max(80)).max(40).default([]),
});
const putSchema = z.object({
  name: z.string().trim().min(1, "Give the annual goal a name.").max(120),
  objectives: z.array(z.string().trim().min(1).max(200)).max(40).default([]),
  metrics: z.array(metricSchema).min(1, "Add at least one measurable target.").max(30),
});

// PUT /api/goals?year=2027 - save the goals for a year. Existing goals keep
// their ids (so events already logged against them still count); new goals
// get a fresh id from their name.
export async function PUT(req: NextRequest) {
  const year = parseYear(req.nextUrl.searchParams.get("year"));
  const body = await req.json().catch(() => null);
  const parsed = putSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const keys: string[] = [];
  const set: GoalSet = {
    name: parsed.data.name,
    objectives: parsed.data.objectives,
    metrics: parsed.data.metrics.map((m) => {
      const key = m.key && /^[a-z0-9_]{1,60}$/.test(m.key) && !keys.includes(m.key) ? m.key : makeGoalKey(m.label, keys);
      keys.push(key);
      return {
        key,
        label: m.label,
        target: m.target,
        comparator: m.comparator,
        description: m.description,
        keywords: Array.from(new Set(m.keywords.map((k) => k.toLowerCase()))),
      };
    }),
  };
  const problem = validateGoalSet(set);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  const saved = await saveGoalSet(year, set);
  return NextResponse.json({ goals: saved });
}
