import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { calculateAffordability } from "@/lib/affordability/calculator";

const bodySchema = z.object({
  annualIncome: z.number().positive(), // dollars
  monthlyRent: z.number().positive(), // dollars
  securityDeposit: z.number().min(0).optional(),
  applicationFee: z.number().min(0).optional(),
  otherMoveInFees: z.number().min(0).optional(),
  utilitiesIncluded: z.boolean().optional(),
  estimatedMonthlyUtilities: z.number().min(0).optional(),
  estimatedMonthlyTransit: z.number().min(0).optional(),
});

export async function POST(request: NextRequest) {
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const input = parsed.data;

  const result = calculateAffordability({
    annualIncomeCents: Math.round(input.annualIncome * 100),
    monthlyRentCents: Math.round(input.monthlyRent * 100),
    securityDepositCents: input.securityDeposit != null ? Math.round(input.securityDeposit * 100) : undefined,
    applicationFeeCents: input.applicationFee != null ? Math.round(input.applicationFee * 100) : undefined,
    otherMoveInFeesCents: input.otherMoveInFees != null ? Math.round(input.otherMoveInFees * 100) : undefined,
    utilitiesIncluded: input.utilitiesIncluded,
    estimatedMonthlyUtilitiesCents:
      input.estimatedMonthlyUtilities != null ? Math.round(input.estimatedMonthlyUtilities * 100) : undefined,
    estimatedMonthlyTransitCents:
      input.estimatedMonthlyTransit != null ? Math.round(input.estimatedMonthlyTransit * 100) : undefined,
  });

  return NextResponse.json(result);
}
