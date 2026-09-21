import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { classifyEntry } from "@/lib/classifier";
import { buildEvidenceDraft, shouldAutoFile } from "@/lib/evidence";
import { toJson } from "@/lib/json";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  content: z.string().trim().min(1, "Entry can't be empty."),
});

// GET /api/entries?limit=10 - most recent daily entries with their classification.
export async function GET(req: NextRequest) {
  const limit = Number(req.nextUrl.searchParams.get("limit") ?? "20");
  const entries = await prisma.dailyEntry.findMany({
    orderBy: { entryDate: "desc" },
    take: Number.isFinite(limit) ? Math.min(limit, 100) : 20,
    include: { classification: true },
  });
  return NextResponse.json({ entries });
}

// POST /api/entries - the core "Daily Brain Dump" capture path.
// Fast write first, classification happens in the same request but never
// blocks on anything external (the classifier is pure, local, synchronous).
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { content } = parsed.data;
  const classification = classifyEntry(content);

  const entry = await prisma.dailyEntry.create({
    data: {
      content,
      classification: {
        create: {
          counts: classification.counts,
          reason: classification.reason,
          categories: toJson(classification.categories),
          departments: toJson(classification.departments),
          impactLevel: classification.impactLevel,
          goalKeys: toJson(classification.goalKeys),
          professionalSummary: classification.professionalSummary,
        },
      },
    },
    include: { classification: true },
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
      data: classification.goalKeys.map((key) => ({
        metricKey: key,
        entryId: entry.id,
      })),
    });
  }

  return NextResponse.json({ entry }, { status: 201 });
}
