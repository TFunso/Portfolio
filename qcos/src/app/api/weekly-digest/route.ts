import { NextResponse } from "next/server";
import { getOrCreateWeeklyDigest, lastCompletedWeek, formatWeekRange } from "@/lib/weeklyDigest";
import { fromJson } from "@/lib/json";
import type { DigestSuggestion } from "@/types";

export const dynamic = "force-dynamic";

// GET /api/weekly-digest - the latest weekly pattern-spotting digest,
// generating it on first request if the cron hasn't run yet this week.
export async function GET() {
  const range = lastCompletedWeek();
  const digest = await getOrCreateWeeklyDigest(range);

  return NextResponse.json({
    digest: {
      ...digest,
      suggestions: fromJson<DigestSuggestion>(digest.suggestions),
      weekLabel: formatWeekRange(range),
    },
  });
}
