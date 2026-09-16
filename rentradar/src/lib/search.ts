import { prisma } from "@/lib/db";
import { dbListingToScored } from "@/lib/aggregation/fromDb";
import { applyFilters, buildRankings, type RankingFilters } from "@/lib/aggregation/rank";
import type { Prisma } from "@prisma/client";

export interface SearchParams extends RankingFilters {
  city?: string;
  zipCode?: string;
  bedrooms?: number;
  limit?: number;
}

/** Shared by /api/search and the dashboard server component so both hit the
 *  same code path against the persisted, pre-scored listing index. */
export async function runSearch(params: SearchParams) {
  const where: Prisma.ListingWhereInput = { status: "ACTIVE" };
  if (params.city) where.city = { equals: params.city, mode: "insensitive" };
  if (params.zipCode) where.zipCode = params.zipCode;
  if (params.bedrooms != null) where.bedrooms = { gte: params.bedrooms };
  if (params.maxRentCents != null) where.monthlyRent = { lte: params.maxRentCents };

  const rows = await prisma.listing.findMany({ where, take: 500, include: { source: true } });
  const scored = rows.map(dbListingToScored);
  const filtered = applyFilters(scored, params);
  const rankings = buildRankings(filtered, params.limit ?? 25);

  return { resultCount: filtered.length, ...rankings };
}
