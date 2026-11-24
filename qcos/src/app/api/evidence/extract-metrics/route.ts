import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractMetrics, hasMetrics, isSirText } from "@/lib/metrics";
import { classifyEntry } from "@/lib/classifier";
import { buildEvidenceDraft, shouldAutoFile } from "@/lib/evidence";
import { toJson } from "@/lib/json";
import { getGoalSet } from "@/lib/goalStore";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST /api/evidence/extract-metrics - one-off catch-up for older entries:
//  1. Evidence with NO result yet: fill results from numbers in its text
//     ("inspected 6 lots", "saved 3 hours"). Records that already have a
//     result are skipped, so a value you typed by hand is never overwritten.
//  2. SIR / first-article evidence with no SIR count or hours yet: fill
//     those two fields from its text.
//  3. Daily entries that mention SIR / first article but were never filed
//     as evidence (the rules before SIR support read them as routine):
//     re-classify with the current rules and file them.
export async function POST() {
  const noResult = await prisma.evidenceRecord.findMany({
    where: {
      hoursSaved: null,
      unitsHandled: null,
      defectsCaught: null,
      delayDaysAvoided: null,
      costAvoided: null,
      sirsCompleted: null,
      hoursSpent: null,
    },
    select: { id: true, whatHappened: true },
  });

  let updated = 0;
  for (const r of noResult) {
    const metrics = extractMetrics(r.whatHappened);
    if (!hasMetrics(metrics) && !metrics.hoursSpent) continue;
    await prisma.evidenceRecord.update({ where: { id: r.id }, data: metrics });
    updated += 1;
  }

  const sirNoFields = await prisma.evidenceRecord.findMany({
    where: { sirsCompleted: null, hoursSpent: null },
    select: { id: true, whatHappened: true },
  });
  for (const r of sirNoFields) {
    if (!isSirText(r.whatHappened)) continue;
    const { sirsCompleted, hoursSpent } = extractMetrics(r.whatHappened);
    if (!sirsCompleted && !hoursSpent) continue;
    await prisma.evidenceRecord.update({ where: { id: r.id }, data: { sirsCompleted, hoursSpent } });
    updated += 1;
  }

  const unfiled = await prisma.dailyEntry.findMany({
    where: { evidenceRecords: { none: {} } },
    select: { id: true, content: true, entryDate: true },
  });
  let filed = 0;
  for (const entry of unfiled) {
    if (!isSirText(entry.content)) continue;
    const goals = await getGoalSet(entry.entryDate.getFullYear());
    const classification = classifyEntry(entry.content, goals.metrics);
    if (!shouldAutoFile(classification)) continue;
    const draft = buildEvidenceDraft(entry.content, classification, goals.metrics);
    await prisma.$transaction([
      prisma.classification.update({
        where: { entryId: entry.id },
        data: {
          counts: classification.counts,
          reason: classification.reason,
          categories: toJson(classification.categories),
          departments: toJson(classification.departments),
          impactLevel: classification.impactLevel,
          goalKeys: toJson(classification.goalKeys),
          professionalSummary: classification.professionalSummary,
        },
      }),
      prisma.evidenceRecord.create({
        data: {
          entryId: entry.id,
          whatHappened: draft.whatHappened,
          whyItMattered: draft.whyItMattered,
          businessImpact: draft.businessImpact,
          goalSupported: draft.goalSupported,
          category: draft.category,
          impactLevel: draft.impactLevel,
          suggestedReviewLanguage: draft.suggestedReviewLanguage,
          source: "daily-entry",
          recordDate: entry.entryDate,
          ...extractMetrics(entry.content),
        },
      }),
    ]);
    filed += 1;
  }

  return NextResponse.json({ scanned: noResult.length, updated, filedSirEntries: filed });
}
