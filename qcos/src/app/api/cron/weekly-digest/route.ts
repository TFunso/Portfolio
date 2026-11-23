import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateWeeklyDigest, lastCompletedWeek, formatWeekRange } from "@/lib/weeklyDigest";
import { appBaseUrl, sendBackupEmail, sendWeeklyNudgeEmail } from "@/lib/email";
import { backupFilename, buildBackup } from "@/lib/backup";
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
    const appUrl = appBaseUrl();

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

  // Monthly backup: the cron runs every Monday, so the first Monday of the
  // month is the one whose date is 1-7. Emails a full JSON backup so a copy
  // of everything lives outside the database.
  let backupEmailed = false;
  if (new Date().getUTCDate() <= 7) {
    const backup = await buildBackup();
    backupEmailed = await sendBackupEmail({
      filename: backupFilename(),
      json: JSON.stringify(backup),
      evidenceCount: backup.counts.evidenceRecords,
      entryCount: backup.counts.dailyEntries,
      appUrl: appBaseUrl(),
    });
  }

  return NextResponse.json({ digest: { ...digest, suggestions }, emailSent, backupEmailed });
}
