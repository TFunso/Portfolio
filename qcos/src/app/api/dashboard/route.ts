import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fromJson } from "@/lib/json";
import { startOfWeek, startOfYear, endOfYear } from "@/lib/dates";
import { GOAL_METRICS, goalMetricStatus } from "@/lib/goals";
import type { Category } from "@/types";

export const dynamic = "force-dynamic";

// GET /api/dashboard - everything the homepage needs in one round trip:
// promotion readiness, goal dashboard, this week's counted things, recent
// entries, and evidence vault highlights.
export async function GET() {
  const now = new Date();
  const weekStart = startOfWeek(now);
  const yearRange = { gte: startOfYear(now), lte: endOfYear(now) };

  const [weekEntries, recentEntries, evidenceHighlights, evidenceCountThisYear, goalEvents, promotionEvidenceCount] =
    await Promise.all([
      prisma.dailyEntry.findMany({
        where: { entryDate: { gte: weekStart } },
        include: { classification: true },
        orderBy: { entryDate: "desc" },
      }),
      prisma.dailyEntry.findMany({
        take: 6,
        orderBy: { entryDate: "desc" },
        include: { classification: true },
      }),
      prisma.evidenceRecord.findMany({
        take: 4,
        orderBy: { recordDate: "desc" },
      }),
      prisma.evidenceRecord.count({ where: { recordDate: yearRange } }),
      prisma.goalMetricEvent.findMany({ where: { eventDate: yearRange } }),
      prisma.evidenceRecord.count({
        where: { recordDate: yearRange, category: { in: ["Leadership", "Cross-Functional Support"] }, impactLevel: "High" },
      }),
    ]);

  const countsByMetric = new Map<string, number>();
  for (const e of goalEvents) countsByMetric.set(e.metricKey, (countsByMetric.get(e.metricKey) ?? 0) + 1);
  const goalStatuses = GOAL_METRICS.map((m) => {
    const actual = countsByMetric.get(m.key) ?? 0;
    return { ...m, actual, status: goalMetricStatus(m, actual) };
  });
  const onTrackCount = goalStatuses.filter((g) => g.status === "green").length;

  const thingsThatCounted = weekEntries
    .filter((e) => e.classification?.counts)
    .map((e) => ({
      id: e.id,
      content: e.content,
      reason: e.classification!.reason,
      impactLevel: e.classification!.impactLevel,
      categories: fromJson<Category>(e.classification!.categories),
      entryDate: e.entryDate,
    }));

  // Promotion Readiness Snapshot: a simple, transparent blend of (a) how
  // many annual-goal metrics are on track, (b) how much evidence has been
  // banked this year, and (c) how much of it is genuinely high-impact
  // cross-functional/leadership material - the stuff promotion cases are
  // made of.
  const goalScore = (onTrackCount / goalStatuses.length) * 40;
  const volumeScore = Math.min(evidenceCountThisYear / 20, 1) * 30;
  const qualityScore = Math.min(promotionEvidenceCount / 5, 1) * 30;
  const readinessScore = Math.round(goalScore + volumeScore + qualityScore);

  const readinessLabel =
    readinessScore >= 75 ? "Strong case ready" : readinessScore >= 45 ? "Building momentum" : "Just getting started";

  return NextResponse.json({
    promotionReadiness: {
      score: readinessScore,
      label: readinessLabel,
      goalsOnTrack: onTrackCount,
      goalsTotal: goalStatuses.length,
      evidenceCountThisYear,
      highImpactCount: promotionEvidenceCount,
    },
    goalDashboard: { metrics: goalStatuses },
    thingsThatCounted,
    recentEntries,
    evidenceHighlights,
  });
}
