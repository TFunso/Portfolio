import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { toJson, fromJson } from "@/lib/json";
import { classifyEntry } from "@/lib/classifier";
import { buildEvidenceDraft } from "@/lib/evidence";
import { polishProfessionalSummary } from "@/lib/ai";
import { MONTH_NAMES } from "@/lib/dates";

export const dynamic = "force-dynamic";

const schema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000),
  answers: z.array(z.string().trim().min(1)).length(3),
});

export async function GET(req: NextRequest) {
  const month = req.nextUrl.searchParams.get("month");
  const year = req.nextUrl.searchParams.get("year");
  const reflections = await prisma.monthlyReflection.findMany({
    where: {
      ...(month ? { month: Number(month) } : {}),
      ...(year ? { year: Number(year) } : {}),
    },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });
  return NextResponse.json({
    reflections: reflections.map((r) => ({ ...r, answers: fromJson<string>(r.answers) })),
  });
}

// POST /api/reflection - "What are 3 things you did this month that made
// somebody else's job easier?" Each answer becomes a STAR-style evidence
// record automatically.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const { month, year, answers } = parsed.data;
  const monthName = MONTH_NAMES[month - 1];

  const reflection = await prisma.monthlyReflection.upsert({
    where: { month_year: { month, year } },
    update: { answers: toJson(answers) },
    create: { month, year, answers: toJson(answers) },
  });

  const evidenceRecords = await Promise.all(
    answers.map(async (answer) => {
      const classification = classifyEntry(answer);
      const draft = buildEvidenceDraft(answer, classification);
      const polished = await polishProfessionalSummary(
        answer,
        {
          reason: classification.reason,
          categories: classification.categories,
          impactLevel: classification.impactLevel,
          departments: classification.departments,
        },
        draft.suggestedReviewLanguage,
      );
      return prisma.evidenceRecord.create({
        data: {
          whatHappened: draft.whatHappened,
          whyItMattered: draft.whyItMattered,
          businessImpact: draft.businessImpact,
          goalSupported: draft.goalSupported,
          category: draft.category,
          impactLevel: draft.impactLevel,
          suggestedReviewLanguage: `${polished} (${monthName} ${year} reflection.)`,
          source: "monthly-reflection",
        },
      });
    }),
  );

  return NextResponse.json({ reflection: { ...reflection, answers }, evidenceRecords }, { status: 201 });
}
