import type { ClassificationResult } from "@/types";
import { goalMetricLabel } from "@/lib/goals";

export interface EvidenceDraft {
  whatHappened: string;
  whyItMattered: string;
  businessImpact: string;
  goalSupported: string | null;
  category: string;
  impactLevel: string;
  suggestedReviewLanguage: string;
}

// Only auto-file entries into the Evidence Vault once they've cleared the
// "does this count?" bar with real impact - keeps the vault meaningful
// instead of a dump of every routine log line.
export function shouldAutoFile(classification: ClassificationResult): boolean {
  return classification.counts && classification.impactLevel !== "Low";
}

export function buildEvidenceDraft(content: string, classification: ClassificationResult): EvidenceDraft {
  const primaryCategory = classification.categories.find((c) => c !== "Promotion Evidence") ?? "Routine Work";
  const goalSupported =
    classification.goalKeys.length > 0 ? classification.goalKeys.map(goalMetricLabel).join(", ") : null;

  return {
    whatHappened: content.trim(),
    whyItMattered: classification.reason,
    businessImpact: classification.reason,
    goalSupported,
    category: primaryCategory,
    impactLevel: classification.impactLevel,
    suggestedReviewLanguage: classification.professionalSummary,
  };
}
