import { PrismaClient } from "@prisma/client";
import { classifyEntry } from "../src/lib/classifier";
import { buildEvidenceDraft, shouldAutoFile } from "../src/lib/evidence";

const prisma = new PrismaClient();

const SAMPLE_ENTRIES = [
  "Inspected 6 lots ahead of the priority schedule",
  "Worked hot sheets to keep the line running",
  "Helped planner locate urgent material that was misrouted",
  "Assisted QE investigation on a recurring defect",
  "Created a QN for a drawing discrepancy on a new part",
  "Learned a new inspection technique for GD&T callouts and shared it with the team",
  "Identified a part as a strong no inspect candidate after reviewing three months of clean lots",
  "Escalated a supplier quality issue that was about to delay a hot sheet build",
  "Helped warehouse find missing material before end of shift",
  "Documented a faster CMM setup process to cut inspection time",
  "Ate lunch and checked email",
];

async function main() {
  console.log("Seeding QCOS with sample daily entries...");

  for (const content of SAMPLE_ENTRIES) {
    const classification = classifyEntry(content);
    const entry = await prisma.dailyEntry.create({
      data: {
        content,
        classification: {
          create: {
            counts: classification.counts,
            reason: classification.reason,
            categories: JSON.stringify(classification.categories),
            departments: JSON.stringify(classification.departments),
            impactLevel: classification.impactLevel,
            goalKeys: JSON.stringify(classification.goalKeys),
            professionalSummary: classification.professionalSummary,
          },
        },
      },
    });

    if (shouldAutoFile(classification)) {
      const draft = buildEvidenceDraft(content, classification);
      await prisma.evidenceRecord.create({
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
        },
      });
    }

    if (classification.goalKeys.length > 0) {
      await prisma.goalMetricEvent.createMany({
        data: classification.goalKeys.map((key) => ({ metricKey: key, entryId: entry.id })),
      });
    }
  }

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
