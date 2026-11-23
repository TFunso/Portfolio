import { NextResponse } from "next/server";
import { backupFilename, buildBackup } from "@/lib/backup";
import { appBaseUrl, emailConfigured, sendBackupEmail } from "@/lib/email";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST /api/backup/email - email a full backup to NOTIFY_EMAIL right now.
export async function POST() {
  if (!emailConfigured()) {
    return NextResponse.json(
      { error: "Email isn't set up - add RESEND_API_KEY and NOTIFY_EMAIL in Vercel to enable it." },
      { status: 400 },
    );
  }
  const backup = await buildBackup();
  const sent = await sendBackupEmail({
    filename: backupFilename(),
    json: JSON.stringify(backup),
    evidenceCount: backup.counts.evidenceRecords,
    entryCount: backup.counts.dailyEntries,
    appUrl: appBaseUrl(),
  });
  if (!sent) return NextResponse.json({ error: "The email service rejected the send - check the Vercel logs." }, { status: 502 });
  return NextResponse.json({ sent: true });
}
