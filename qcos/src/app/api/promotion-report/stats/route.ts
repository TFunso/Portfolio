import { NextRequest, NextResponse } from "next/server";
import { getPromotionStats, parseScope } from "@/lib/promotionReport";

export const dynamic = "force-dynamic";

// GET /api/promotion-report/stats?scope=all-time | ?scope=year&year=2026
// The numbers behind the Promotion Report dashboard - deterministic and
// computed live, independent of whether a narrative has been generated.
export async function GET(req: NextRequest) {
  const scope = parseScope(req.nextUrl.searchParams.get("scope"), req.nextUrl.searchParams.get("year"));
  const stats = await getPromotionStats(scope);
  return NextResponse.json({ stats });
}
