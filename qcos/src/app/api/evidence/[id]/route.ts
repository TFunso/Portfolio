import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.evidenceRecord.delete({ where: { id: params.id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
