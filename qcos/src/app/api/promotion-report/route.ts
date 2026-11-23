import { NextRequest, NextResponse } from "next/server";
import { generatePromotionReport, getCachedPromotionReport, parseScope } from "@/lib/promotionReport";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// GET /api/promotion-report?scope=all-time | ?scope=year&year=2026
// Returns the cached report for this scope, or null if none has been
// generated yet - the page prompts the user to generate one in that case.
export async function GET(req: NextRequest) {
  const scope = parseScope(req.nextUrl.searchParams.get("scope"), req.nextUrl.searchParams.get("year"));
  const report = await getCachedPromotionReport(scope);
  return NextResponse.json({ report });
}

// POST /api/promotion-report - (re)generate the report for a scope. Costs
// one AI call when ANTHROPIC_API_KEY is set; otherwise produces the
// deterministic compiled fallback. Body: { scope: "all-time" | "year", year?: number }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const scope = parseScope(body?.scope ?? null, body?.year != null ? String(body.year) : null);
  const report = await generatePromotionReport(scope);
  return NextResponse.json({ report }, { status: 201 });
}
