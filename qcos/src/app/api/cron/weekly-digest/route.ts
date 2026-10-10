import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateWeeklyDigest, lastCompletedWeek, formatWeekRange } from "@/lib/weeklyDigest";
import { sendWeeklyNudgeEmail } from "@/lib/email";
import { fromJson } from "@/lib/json";
import type { DigestSuggestion } from "@/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// GET /api/cron/weekly-digest - fired by Vercel Cron (see vercel.json).
// Vercel automatically sends `Authorization: Bearer $CRON_SECRET` on cron
// invocations when CRON_SECRET is set on the project; this checks that
// header so the route can't be triggered by anyone else who finds the URL.
// If CRON_SECRET isn't set, the check is skipped (useful for local testing
// with `curl localhost:3000/api/cron/weekly-digest`).
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const range = lastCompletedWeek();
  const digest = await getOrCreateWeeklyDigest(range);
  const suggestions = fromJson<DigestSuggestion>(digest.suggestions);

  let emailSent = false;
  if (!digest.emailSentAt) {
    const appUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "https://qcos.vercel.app";

    emailSent = await sendWeeklyNudgeEmail({
      weekLabel: formatWeekRange(range),
      summary: digest.summary,
      suggestionCount: suggestions.length,
      appUrl,
    });

    if (emailSent) {
      await prisma.weeklyDigest.update({ where: { id: digest.id }, data: { emailSentAt: new Date() } });
    }
  }

  return NextResponse.json({ digest: { ...digest, suggestions }, emailSent });
}
