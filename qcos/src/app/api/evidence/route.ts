import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth, startOfQuarter } from "@/lib/dates";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  whatHappened: z.string().trim().min(1),
  whyItMattered: z.string().trim().min(1),
  businessImpact: z.string().trim().min(1),
  goalSupported: z.string().trim().optional(),
  category: z.string().trim().min(1),
  impactLevel: z.enum(["High", "Medium", "Low"]),
  suggestedReviewLanguage: z.string().trim().min(1),
});

// GET /api/evidence?month=9&year=2026&quarter=true&category=Leadership&impactLevel=High
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const month = params.get("month");
  const year = params.get("year");
  const quarter = params.get("quarter");
  const category = params.get("category");
  const impactLevel = params.get("impactLevel");
  const goal = params.get("goal");

  const where: Prisma.EvidenceRecordWhereInput = {};

  const now = new Date();
  const y = year ? Number(year) : now.getFullYear();

  if (month) {
    const ref = new Date(y, Number(month) - 1, 1);
    where.recordDate = { gte: startOfMonth(ref), lte: endOfMonth(ref) };
  } else if (quarter === "true") {
    const ref = new Date(y, now.getMonth(), 1);
    const qStart = startOfQuarter(ref);
    const qEnd = new Date(qStart.getFullYear(), qStart.getMonth() + 3, 0, 23, 59, 59, 999);
    where.recordDate = { gte: qStart, lte: qEnd };
  }

  if (category) where.category = category;
  if (impactLevel) where.impactLevel = impactLevel;
  if (goal) where.goalSupported = { contains: goal };

  const records = await prisma.evidenceRecord.findMany({
    where,
    orderBy: { recordDate: "desc" },
  });

  return NextResponse.json({ records });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const record = await prisma.evidenceRecord.create({
    data: { ...parsed.data, source: "manual" },
  });

  return NextResponse.json({ record }, { status: 201 });
}
