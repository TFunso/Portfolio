import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { GOAL_METRICS, goalMetricStatus, ANNUAL_GOAL } from "@/lib/goals";
import { startOfYear, endOfYear } from "@/lib/dates";
import type { GoalMetricStatus } from "@/types";

export const dynamic = "force-dynamic";

// GET /api/goals - current-year actuals against each DRIVE EFFICIENCY metric.
export async function GET(req: NextRequest) {
  const yearParam = req.nextUrl.searchParams.get("year");
  const now = new Date();
  const year = yearParam ? Number(yearParam) : now.getFullYear();
  const ref = new Date(year, 0, 1);
  const range = { gte: startOfYear(ref), lte: endOfYear(ref) };

  const events = await prisma.goalMetricEvent.findMany({
    where: { eventDate: range },
  });

  const counts = new Map<string, number>();
  for (const e of events) {
    counts.set(e.metricKey, (counts.get(e.metricKey) ?? 0) + 1);
  }

  const metrics: GoalMetricStatus[] = GOAL_METRICS.map((m) => {
    const actual = counts.get(m.key) ?? 0;
    return {
      key: m.key,
      label: m.label,
      target: m.target,
      comparator: m.comparator,
      actual,
      status: goalMetricStatus(m, actual),
    };
  });

  const greenCount = metrics.filter((m) => m.status === "green").length;

  return NextResponse.json({
    goal: ANNUAL_GOAL,
    year,
    metrics,
    summary: {
      onTrack: greenCount,
      total: metrics.length,
    },
  });
}

const logSchema = z.object({
  metricKey: z.enum([
    "no_inspect_candidate",
    "supplier_cert_candidate",
    "improvement_project",
    "qn_clarification_request",
    "communication_delay",
    "knowledge_sharing_event",
  ]),
  note: z.string().trim().optional(),
});

// POST /api/goals - manually log a metric event (e.g. logging a No Inspect
// candidate the classifier didn't catch from free text).
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = logSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const event = await prisma.goalMetricEvent.create({ data: parsed.data });
  return NextResponse.json({ event }, { status: 201 });
}
