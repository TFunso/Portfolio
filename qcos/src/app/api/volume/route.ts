import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { deleteVolumeMonth, getVolumeYear, upsertVolumeMonths } from "@/lib/volumeData";
import { monthLabel, validateMonth } from "@/lib/volume";

export const dynamic = "force-dynamic";

const count = z.number().int().min(0).max(10_000_000);
const monthSchema = z.object({
  year: z.number().int().min(1990).max(2200),
  month: z.number().int().min(1).max(12),
  inspected: count,
  accepted: count,
  rejected: count,
});
const putSchema = z.object({ months: z.array(monthSchema).min(1).max(240) });

// GET /api/volume?year=2026 - the year's monthly SAP inspection totals.
export async function GET(req: NextRequest) {
  const year = Number(req.nextUrl.searchParams.get("year") ?? new Date().getFullYear());
  if (!Number.isInteger(year)) return NextResponse.json({ error: "Invalid year" }, { status: 400 });
  return NextResponse.json({ months: await getVolumeYear(year) });
}

// PUT /api/volume { months: [{ year, month, inspected, accepted, rejected }] }
// Saves monthly totals; an existing month is replaced, not added to.
export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = putSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  for (const m of parsed.data.months) {
    const problem = validateMonth(m);
    if (problem) return NextResponse.json({ error: `${monthLabel(m.year, m.month)}: ${problem}` }, { status: 400 });
  }
  const saved = await upsertVolumeMonths(parsed.data.months);
  return NextResponse.json({ saved });
}

// DELETE /api/volume?year=2026&month=3 - clears one month.
export async function DELETE(req: NextRequest) {
  const year = Number(req.nextUrl.searchParams.get("year"));
  const month = Number(req.nextUrl.searchParams.get("month"));
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return NextResponse.json({ error: "Invalid month" }, { status: 400 });
  }
  await deleteVolumeMonth(year, month);
  return NextResponse.json({ ok: true });
}
