import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractMetrics, hasMetrics } from "@/lib/metrics";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST /api/evidence/extract-metrics - one-off catch-up for evidence logged
// before results were captured: scans records that have NO result yet for
// numbers in their text ("inspected 6 lots", "saved 3 hours") and fills
// them in. Records that already have any result are skipped, so a value
// you typed by hand is never overwritten.
export async function POST() {
  const records = await prisma.evidenceRecord.findMany({
    where: {
      hoursSaved: null,
      unitsHandled: null,
      defectsCaught: null,
      delayDaysAvoided: null,
      costAvoided: null,
    },
    select: { id: true, whatHappened: true },
  });

  let updated = 0;
  for (const r of records) {
    const metrics = extractMetrics(r.whatHappened);
    if (!hasMetrics(metrics)) continue;
    await prisma.evidenceRecord.update({ where: { id: r.id }, data: metrics });
    updated += 1;
  }

  return NextResponse.json({ scanned: records.length, updated });
}
