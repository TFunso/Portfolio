import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resultInputSchema, updateEvidenceResult } from "@/lib/evidenceResult";

export const dynamic = "force-dynamic";

// PATCH /api/evidence/:id { starred?, hoursSaved?, ... } - star a top win or
// edit its measurable result from the Evidence Vault.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null);
  const parsed = resultInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const record = await updateEvidenceResult(params.id, parsed.data).catch(() => null);
  if (!record) return NextResponse.json({ error: "Evidence not found." }, { status: 404 });
  return NextResponse.json({ record });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.evidenceRecord.delete({ where: { id: params.id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
