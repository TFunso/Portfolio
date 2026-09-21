import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { evaluateDidThisCount } from "@/lib/classifier";

export const dynamic = "force-dynamic";

const schema = z.object({
  activity: z.string().trim().min(1, "Describe the activity first."),
  saveAsEvidence: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  const limit = Number(req.nextUrl.searchParams.get("limit") ?? "20");
  const logs = await prisma.didThisCountLog.findMany({
    orderBy: { createdAt: "desc" },
    take: Number.isFinite(limit) ? Math.min(limit, 100) : 20,
  });
  return NextResponse.json({ logs });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { activity, saveAsEvidence } = parsed.data;
  const result = evaluateDidThisCount(activity);

  const log = await prisma.didThisCountLog.create({
    data: {
      activity,
      counts: result.counts,
      businessImpact: result.businessImpact,
      goalAlignment: result.goalAlignment,
      promotionValue: result.promotionValue,
      recommendedLanguage: result.recommendedLanguage,
      savedAsEvidence: Boolean(saveAsEvidence && result.counts),
    },
  });

  if (saveAsEvidence && result.counts) {
    await prisma.evidenceRecord.create({
      data: {
        whatHappened: activity,
        whyItMattered: result.businessImpact,
        businessImpact: result.businessImpact,
        goalSupported: result.goalAlignment,
        category: "Goal Contributions",
        impactLevel: result.promotionValue.startsWith("Strong") ? "High" : result.promotionValue.startsWith("Moderate") ? "Medium" : "Low",
        suggestedReviewLanguage: result.recommendedLanguage,
        source: "did-this-count",
      },
    });
  }

  return NextResponse.json({ result, log }, { status: 201 });
}
