import { NextRequest, NextResponse } from "next/server";
import { backupCounts, backupFilename, buildBackup, evidenceCsv } from "@/lib/backup";
import { emailConfigured } from "@/lib/email";

export const dynamic = "force-dynamic";

// GET /api/backup              -> full JSON backup (download; restorable)
// GET /api/backup?format=csv   -> Evidence Vault as a spreadsheet (download)
// GET /api/backup?format=summary -> row counts + whether email backup is set up
export async function GET(req: NextRequest) {
  const format = req.nextUrl.searchParams.get("format") ?? "json";

  if (format === "summary") {
    return NextResponse.json({ counts: await backupCounts(), emailConfigured: emailConfigured() });
  }

  if (format === "csv") {
    return new NextResponse(await evidenceCsv(), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${backupFilename(new Date(), "csv").replace("backup", "evidence")}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const backup = await buildBackup();
  return new NextResponse(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${backupFilename()}"`,
      "Cache-Control": "no-store",
    },
  });
}
