import { NextRequest, NextResponse } from "next/server";
import { ensureEvidenceForEntry, resultInputSchema, updateEvidenceResult } from "@/lib/evidenceResult";

export const dynamic = "force-dynamic";

// PATCH /api/entries/:id/result { hoursSaved?, unitsHandled?, defectsCaught?,
// delayDaysAvoided?, costAvoided?, starred? } - attach a measurable result
// and/or a "top win" star to a just-logged entry. Creates the evidence
// record if the classifier hadn't auto-filed one.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null);
  const parsed = resultInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const evidence = await ensureEvidenceForEntry(params.id);
  if (!evidence) return NextResponse.json({ error: "Entry not found." }, { status: 404 });
  const updated = await updateEvidenceResult(evidence.id, parsed.data);
  return NextResponse.json({ evidence: updated });
}
