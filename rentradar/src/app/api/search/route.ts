import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { runSearch } from "@/lib/search";

const searchParamsSchema = z.object({
  city: z.string().optional(),
  zipCode: z.string().optional(),
  maxRent: z.coerce.number().positive().optional(), // dollars
  bedrooms: z.coerce.number().min(0).optional(),
  petFriendly: z.coerce.boolean().optional(),
  parkingAvailable: z.coerce.boolean().optional(),
  furnished: z.coerce.boolean().optional(),
  shortTermLease: z.coerce.boolean().optional(),
  noCreditCheck: z.coerce.boolean().optional(),
  lowDeposit: z.coerce.boolean().optional(),
  utilitiesIncluded: z.coerce.boolean().optional(),
  limit: z.coerce.number().min(1).max(100).default(25),
});

/**
 * GET /api/search?city=Columbus&maxRent=1200&bedrooms=1
 *
 * Queries the persisted, already-scored listing index (populated by the
 * ingestion worker in src/workers/rentHunter.ts) rather than the live source
 * adapters, so response times stay fast. In production this table-scan is
 * replaced by an Elasticsearch query against the same fields -- see
 * docs/ARCHITECTURE.md.
 */
export async function GET(request: NextRequest) {
  const parsed = searchParamsSchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const params = parsed.data;

  const result = await runSearch({
    city: params.city,
    zipCode: params.zipCode,
    bedrooms: params.bedrooms,
    maxRentCents: params.maxRent != null ? Math.round(params.maxRent * 100) : undefined,
    petFriendly: params.petFriendly,
    parkingAvailable: params.parkingAvailable,
    furnished: params.furnished,
    shortTermLease: params.shortTermLease,
    noCreditCheck: params.noCreditCheck,
    lowDeposit: params.lowDeposit,
    utilitiesIncluded: params.utilitiesIncluded,
    limit: params.limit,
  });

  return NextResponse.json(result);
}
