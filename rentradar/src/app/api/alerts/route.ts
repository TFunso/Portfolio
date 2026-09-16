import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUserId } from "@/lib/auth";

const createSchema = z.object({
  savedSearchId: z.string().optional(),
  channel: z.enum(["EMAIL", "SMS", "PUSH"]),
  triggerType: z.enum(["NEW_CHEAPER_LISTING", "RENT_DROP", "AVAILABILITY_CHANGE", "LANDLORD_RESPONSE", "NEW_MATCH"]),
});

export async function GET(request: NextRequest) {
  const userId = await requireUserId(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const alerts = await prisma.alert.findMany({
    where: { userId },
    include: { matches: { orderBy: { createdAt: "desc" }, take: 10 } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ alerts });
}

export async function POST(request: NextRequest) {
  const userId = await requireUserId(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const input = parsed.data;

  const alert = await prisma.alert.create({
    data: {
      userId,
      savedSearchId: input.savedSearchId,
      channel: input.channel,
      triggerType: input.triggerType,
    },
  });

  return NextResponse.json({ alert }, { status: 201 });
}
