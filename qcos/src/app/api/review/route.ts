import { NextRequest, NextResponse } from "next/server";
import { getYearInReview } from "@/lib/review";

export const dynamic = "force-dynamic";

// GET /api/review?year=2026 - compiles every stored EvidenceRecord for the
// year into a Year-End Self Assessment. Only ever pulls from data already
// saved in the app, never fabricates accomplishments.
export async function GET(req: NextRequest) {
  const year = Number(req.nextUrl.searchParams.get("year") ?? new Date().getFullYear());
  const data = await getYearInReview(year);
  return NextResponse.json(data);
}
