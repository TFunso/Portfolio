import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfYear, endOfYear } from "@/lib/dates";
import { GOAL_METRICS, goalMetricStatus, ANNUAL_GOAL } from "@/lib/goals";

export const dynamic = "force-dynamic";

const CATEGORY_TO_SECTION: Record<string, string> = {
  "Cross-Functional Support": "crossFunctionalSupport",
  Leadership: "leadership",
  "Knowledge Sharing": "knowledgeSharing",
  "Continuous Improvement": "continuousImprovement",
  "Goal Contribution": "goalAchievement",
  "Goal Contributions": "goalAchievement",
};

// GET /api/review?year=2026 - compiles every stored EvidenceRecord for the
// year into a Year-End Self Assessment. Only ever pulls from data already
// saved in the app, never fabricates accomplishments.
export async function GET(req: NextRequest) {
  const year = Number(req.nextUrl.searchParams.get("year") ?? new Date().getFullYear());
  const ref = new Date(year, 0, 1);
  const range = { gte: startOfYear(ref), lte: endOfYear(ref) };

  const [records, goalEvents] = await Promise.all([
    prisma.evidenceRecord.findMany({ where: { recordDate: range }, orderBy: { recordDate: "asc" } }),
    prisma.goalMetricEvent.findMany({ where: { eventDate: range } }),
  ]);

  const counts = new Map<string, number>();
  for (const e of goalEvents) counts.set(e.metricKey, (counts.get(e.metricKey) ?? 0) + 1);

  const goalAchievementSummary = GOAL_METRICS.map((m) => {
    const actual = counts.get(m.key) ?? 0;
    return {
      label: m.label,
      target: m.target,
      comparator: m.comparator,
      actual,
      status: goalMetricStatus(m, actual),
    };
  });

  const sections: Record<string, typeof records> = {
    crossFunctionalSupport: [],
    leadership: [],
    knowledgeSharing: [],
    continuousImprovement: [],
    goalAchievement: [],
    other: [],
  };

  for (const record of records) {
    const key = CATEGORY_TO_SECTION[record.category] ?? "other";
    sections[key].push(record);
  }

  const topAccomplishments = [...records]
    .sort((a, b) => impactRank(b.impactLevel) - impactRank(a.impactLevel))
    .slice(0, 8);

  const talkingPoints = buildTalkingPoints(records, goalAchievementSummary);

  return NextResponse.json({
    year,
    goal: ANNUAL_GOAL,
    totalEvidenceCount: records.length,
    goalAchievementSummary,
    topAccomplishments,
    sections,
    talkingPoints,
  });
}

function impactRank(level: string): number {
  return level === "High" ? 3 : level === "Medium" ? 2 : 1;
}

function buildTalkingPoints(
  records: { category: string; impactLevel: string; suggestedReviewLanguage: string }[],
  goalSummary: { label: string; actual: number; target: number; status: string }[],
) {
  const promotion: string[] = [];
  const raise: string[] = [];

  const highImpact = records.filter((r) => r.impactLevel === "High");
  for (const r of highImpact.slice(0, 5)) {
    promotion.push(r.suggestedReviewLanguage);
  }

  const metGoals = goalSummary.filter((g) => g.status === "green");
  for (const g of metGoals) {
    raise.push(`Met or exceeded the "${g.label}" target (${g.actual} vs. target ${g.target}).`);
  }
  const crossFunctionalCount = records.filter((r) => r.category === "Cross-Functional Support").length;
  if (crossFunctionalCount > 0) {
    raise.push(`Delivered ${crossFunctionalCount} documented instances of cross-functional support beyond core job scope.`);
  }

  if (promotion.length === 0) {
    promotion.push("Log more high-impact entries (urgent saves, led initiatives, cross-team wins) to build this out.");
  }
  if (raise.length === 0) {
    raise.push("Log more goal-aligned entries throughout the year to build this out.");
  }

  return { promotion, raise };
}
