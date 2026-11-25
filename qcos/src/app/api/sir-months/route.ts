import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { deleteSirMonth, getSirEntryMonths, getSirMonthsYear, upsertSirMonths } from "@/lib/sirData";

export const dynamic = "force-dynamic";

const monthSchema = z.object({
  year: z.number().int().min(1990).max(2200),
  month: z.number().int().min(1).max(12),
  completed: z.number().int().min(0).max(100_000),
  hours: z.number().min(0).max(100_000).nullable(),
  findings: z.number().int().min(0).max(100_000).nullable(),
});
const putSchema = z.object({ months: z.array(monthSchema).min(1).max(240) });

// GET /api/sir-months?year=2026 - the year's monthly SIR totals, plus what
// daily entries logged per month (for comparison in the grid).
export async function GET(req: NextRequest) {
  const year = Number(req.nextUrl.searchParams.get("year") ?? new Date().getFullYear());
  if (!Number.isInteger(year)) return NextResponse.json({ error: "Invalid year" }, { status: 400 });
  const [months, fromEntries] = await Promise.all([getSirMonthsYear(year), getSirEntryMonths(year)]);
  return NextResponse.json({ months, fromEntries });
}

// PUT /api/sir-months { months: [{ year, month, completed, hours, findings }] }
// Saves monthly totals; an existing month is replaced, not added to.
export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = putSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const saved = await upsertSirMonths(parsed.data.months);
  return NextResponse.json({ saved });
}

// DELETE /api/sir-months?year=2026&month=3 - clears one month (that month
// goes back to using SIRs from daily entries).
export async function DELETE(req: NextRequest) {
  const year = Number(req.nextUrl.searchParams.get("year"));
  const month = Number(req.nextUrl.searchParams.get("month"));
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return NextResponse.json({ error: "Invalid month" }, { status: 400 });
  }
  await deleteSirMonth(year, month);
  return NextResponse.json({ ok: true });
}
