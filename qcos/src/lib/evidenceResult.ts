import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { fromJson } from "@/lib/json";
import { buildEvidenceDraft } from "@/lib/evidence";
import type { Category, ClassificationResult, Department, GoalMetricKey, ImpactLevel } from "@/types";

// ---------------------------------------------------------------------------
// Adding a measurable result and/or a "top win" star to evidence - from the
// capture form right after logging, or later from the Evidence Vault.
// ---------------------------------------------------------------------------

const metric = (max: number) => z.number().min(0).max(max).nullable().optional();

export const resultInputSchema = z.object({
  starred: z.boolean().optional(),
  hoursSaved: metric(100_000),
  unitsHandled: metric(10_000_000),
  defectsCaught: metric(1_000_000),
  delayDaysAvoided: metric(10_000),
  costAvoided: metric(1_000_000_000),
});

export type ResultInput = z.infer<typeof resultInputSchema>;

function toData(input: ResultInput) {
  const data: Record<string, number | boolean | null> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined) continue;
    // Integer columns: round whatever was typed.
    if (typeof value === "number" && ["unitsHandled", "defectsCaught", "costAvoided"].includes(key)) {
      data[key] = Math.round(value);
    } else {
      data[key] = value === 0 ? null : value; // 0 means "cleared"
    }
  }
  return data;
}

export async function updateEvidenceResult(evidenceId: string, input: ResultInput) {
  return prisma.evidenceRecord.update({ where: { id: evidenceId }, data: toData(input) });
}

// An entry the classifier didn't auto-file (routine / low impact) still
// becomes evidence once you attach a measurable result or star it - you
// adding proof is a stronger signal than any keyword rule. Its impact is
// raised to at least Medium; the classifier's stored verdict is untouched.
export async function ensureEvidenceForEntry(entryId: string) {
  const existing = await prisma.evidenceRecord.findFirst({ where: { entryId }, orderBy: { createdAt: "asc" } });
  if (existing) return existing;

  const entry = await prisma.dailyEntry.findUnique({ where: { id: entryId }, include: { classification: true } });
  if (!entry || !entry.classification) return null;

  const c = entry.classification;
  const classification: ClassificationResult = {
    counts: c.counts,
    reason: c.reason,
    categories: fromJson<Category>(c.categories),
    departments: fromJson<Department>(c.departments),
    impactLevel: c.impactLevel as ImpactLevel,
    goalKeys: fromJson<GoalMetricKey>(c.goalKeys),
    professionalSummary: c.professionalSummary,
  };
  const draft = buildEvidenceDraft(entry.content, classification);

  return prisma.evidenceRecord.create({
    data: {
      entryId: entry.id,
      whatHappened: draft.whatHappened,
      whyItMattered: draft.whyItMattered,
      businessImpact: draft.businessImpact,
      goalSupported: draft.goalSupported,
      category: draft.category,
      impactLevel: draft.impactLevel === "Low" ? "Medium" : draft.impactLevel,
      suggestedReviewLanguage: draft.suggestedReviewLanguage,
      source: "daily-entry",
      recordDate: entry.entryDate,
    },
  });
}
