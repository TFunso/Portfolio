import { NextRequest, NextResponse } from "next/server";
import { getPeriodReport } from "@/lib/review";
import { parsePeriodParams } from "@/lib/periods";

export const dynamic = "force-dynamic";

// GET /api/review?period=mid-year&year=2026
//     /api/review?period=q3&year=2026
//     /api/review?period=custom&from=2026-02-01&to=2026-04-30
// Compiles saved evidence for a review period (compared with the previous
// equivalent period). Only ever pulls from data already in the app.
// No params -> the period the review calendar says is next (see
// defaultPeriod in src/lib/periods.ts).
export async function GET(req: NextRequest) {
  const period = parsePeriodParams(req.nextUrl.searchParams);
  return NextResponse.json(await getPeriodReport(period));
}
