import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { dbListingToScored } from "@/lib/aggregation/fromDb";

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const row = await prisma.listing.findUnique({
    where: { id: params.id },
    include: { priceHistory: { orderBy: { recordedAt: "asc" } }, source: true },
  });

  if (!row) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  return NextResponse.json({
    listing: dbListingToScored(row),
    priceHistory: row.priceHistory.map((p) => ({ monthlyRentCents: p.monthlyRent, recordedAt: p.recordedAt })),
  });
}
