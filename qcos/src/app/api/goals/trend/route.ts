import { NextRequest, NextResponse } from "next/server";
import { getKpiTrend } from "@/lib/kpiTrend";
import type { GoalMetricKey } from "@/types";

export const dynamic = "force-dynamic";

const VALID_KEYS: GoalMetricKey[] = [
  "no_inspect_candidate",
  "supplier_cert_candidate",
  "improvement_project",
  "qn_clarification_request",
  "communication_delay",
  "knowledge_sharing_event",
];

// GET /api/goals/trend?months=6&metricKey=no_inspect_candidate - monthly
// KPI counts split by captured (auto-detected from an entry) vs reported
// (logged manually). metricKey is optional; omitted means all 6 combined.
export async function GET(req: NextRequest) {
  const monthsParam = Number(req.nextUrl.searchParams.get("months") ?? "6");
  const months = Number.isFinite(monthsParam) ? Math.min(Math.max(Math.trunc(monthsParam), 1), 24) : 6;

  const metricKeyParam = req.nextUrl.searchParams.get("metricKey");
  const metricKey = VALID_KEYS.includes(metricKeyParam as GoalMetricKey) ? (metricKeyParam as GoalMetricKey) : undefined;

  const points = await getKpiTrend(months, metricKey);
  return NextResponse.json({ months, metricKey: metricKey ?? null, points });
}
