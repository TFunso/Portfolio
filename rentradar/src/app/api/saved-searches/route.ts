import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";
import type { Prisma } from "@prisma/client";

const createSchema = z.object({
  name: z.string().min(1),
  location: z.string().min(1),
  radiusMiles: z.number().positive().default(5),
  maxRent: z.number().positive().optional(), // dollars
  minBedrooms: z.number().min(0).optional(),
  moveInDate: z.string().datetime().optional(),
  filters: z.record(z.unknown()).default({}),
});

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const searches = await prisma.savedSearch.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ savedSearches: searches });
}

export async function POST(request: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const input = parsed.data;

  const saved = await prisma.savedSearch.create({
    data: {
      userId,
      name: input.name,
      location: input.location,
      radiusMiles: input.radiusMiles,
      maxRent: input.maxRent != null ? Math.round(input.maxRent * 100) : null,
      minBedrooms: input.minBedrooms,
      moveInDate: input.moveInDate ? new Date(input.moveInDate) : null,
      filters: input.filters as Prisma.InputJsonValue,
    },
  });

  return NextResponse.json({ savedSearch: saved }, { status: 201 });
}
