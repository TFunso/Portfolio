import { NextRequest, NextResponse } from "next/server";
import { getKpiTrend } from "@/lib/kpiTrend";

export const dynamic = "force-dynamic";

// GET /api/goals/trend?months=6&metricKey=no_inspect_candidate - monthly
// KPI counts split by captured (auto-detected from an entry) vs reported
// (logged manually). metricKey is optional; omitted means all goals combined.
export async function GET(req: NextRequest) {
  const monthsParam = Number(req.nextUrl.searchParams.get("months") ?? "6");
  const months = Number.isFinite(monthsParam) ? Math.min(Math.max(Math.trunc(monthsParam), 1), 24) : 6;

  const metricKeyParam = req.nextUrl.searchParams.get("metricKey");
  // Goal ids are data now (they vary by year), so accept any id-shaped value.
  const metricKey = metricKeyParam && /^[a-z0-9_]{1,60}$/.test(metricKeyParam) ? metricKeyParam : undefined;

  const points = await getKpiTrend(months, metricKey);
  return NextResponse.json({ months, metricKey: metricKey ?? null, points });
}
