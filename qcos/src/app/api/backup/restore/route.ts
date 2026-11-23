import { NextRequest, NextResponse } from "next/server";
import { BackupFormatError, restoreBackup } from "@/lib/backup";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST /api/backup/restore (body: the backup JSON) - merges a backup into
// the database. Never overwrites or deletes; rows that already exist are
// skipped. Note Vercel caps request bodies at ~4.5 MB.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "That file isn't valid JSON." }, { status: 400 });

  try {
    const result = await restoreBackup(body);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof BackupFormatError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Backup restore failed:", error);
    return NextResponse.json(
      { error: "Restore failed partway and was rolled back - nothing was changed." },
      { status: 500 },
    );
  }
}
