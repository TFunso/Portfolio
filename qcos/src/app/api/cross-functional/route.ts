import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fromJson } from "@/lib/json";
import { startOfMonth, endOfMonth } from "@/lib/dates";
import type { Category, Department } from "@/types";

export const dynamic = "force-dynamic";

// GET /api/cross-functional?month=9&year=2026 - department support totals
// and a plain-language summary for the requested month (defaults: current).
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const now = new Date();
  const month = params.get("month") ? Number(params.get("month")) : now.getMonth() + 1;
  const year = params.get("year") ? Number(params.get("year")) : now.getFullYear();
  const ref = new Date(year, month - 1, 1);

  const classifications = await prisma.classification.findMany({
    where: {
      entry: { entryDate: { gte: startOfMonth(ref), lte: endOfMonth(ref) } },
      categories: { contains: "Cross-Functional Support" },
    },
    include: { entry: true },
    orderBy: { entry: { entryDate: "desc" } },
  });

  const totals = new Map<Department, number>();
  const examples: Record<string, string[]> = {};

  for (const c of classifications) {
    const departments = fromJson<Department>(c.departments);
    const categories = fromJson<Category>(c.categories);
    if (!categories.includes("Cross-Functional Support")) continue;

    const depts = departments.length > 0 ? departments : (["Operations"] as Department[]);
    for (const dept of depts) {
      totals.set(dept, (totals.get(dept) ?? 0) + 1);
      if (!examples[dept]) examples[dept] = [];
      if (examples[dept].length < 3) examples[dept].push(c.entry.content);
    }
  }

  const rows = Array.from(totals.entries())
    .map(([department, count]) => ({ department, count, examples: examples[department] ?? [] }))
    .sort((a, b) => b.count - a.count);

  const totalSupportEvents = rows.reduce((sum, r) => sum + r.count, 0);
  const summary =
    totalSupportEvents === 0
      ? "No cross-functional support logged yet this month - log daily entries mentioning who you helped to start building this out."
      : `Provided ${totalSupportEvents} cross-functional support ${totalSupportEvents === 1 ? "instance" : "instances"} across ${rows.length} ${rows.length === 1 ? "team" : "teams"} this month${rows[0] ? `, most often supporting ${rows[0].department}` : ""}.`;

  return NextResponse.json({ month, year, rows, totalSupportEvents, summary });
}
