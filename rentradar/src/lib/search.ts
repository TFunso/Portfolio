import { prisma } from "@/lib/db";
import { dbListingToScored } from "@/lib/aggregation/fromDb";
import { applyFilters, buildRankings, type RankingFilters } from "@/lib/aggregation/rank";
import { boundingBox, haversineMiles, type GeoPoint } from "@/lib/geo";
import { geocodeLocation } from "@/lib/geocoding";
import type { Prisma } from "@prisma/client";
import type { ScoredListing } from "@/types/listing";

const DEFAULT_RADIUS_MILES = 25;

export interface SearchParams extends RankingFilters {
  /** Freeform: city, ZIP, street address, "near <landmark>". Geocoded via
   *  Mapbox and filtered by great-circle distance. Falls back to an
   *  unfiltered search if geocoding is unavailable or finds nothing. */
  location?: string;
  radiusMiles?: number;
  bedrooms?: number;
  limit?: number;
}

export interface SearchResult {
  resultCount: number;
  /** The geocoded center of the search, when `location` resolved. Used to
   *  center the map even when zero listings are in range. */
  center?: GeoPoint;
  cheapestOverall: ScoredListing[];
  cheapestByCategory: ReturnType<typeof buildRankings>["cheapestByCategory"];
}

/** Shared by /api/search and the dashboard server component so both hit the
 *  same code path against the persisted, pre-scored listing index. */
export async function runSearch(params: SearchParams): Promise<SearchResult> {
  const where: Prisma.ListingWhereInput = { status: "ACTIVE" };
  if (params.bedrooms != null) where.bedrooms = { gte: params.bedrooms };
  if (params.maxRentCents != null) where.monthlyRent = { lte: params.maxRentCents };

  let center: GeoPoint | undefined;
  const radiusMiles = params.radiusMiles ?? DEFAULT_RADIUS_MILES;

  if (params.location) {
    center = (await geocodeLocation(params.location)) ?? undefined;
  }

  if (center) {
    const box = boundingBox(center, radiusMiles);
    where.latitude = { gte: box.minLat, lte: box.maxLat };
    where.longitude = { gte: box.minLng, lte: box.maxLng };
  }

  const rows = await prisma.listing.findMany({ where, take: 1000, include: { source: true } });
  let scored = rows.map(dbListingToScored);

  if (center) {
    const c = center;
    scored = scored.filter(
      (l) => l.latitude != null && l.longitude != null && haversineMiles(c.lat, c.lng, l.latitude, l.longitude) <= radiusMiles,
    );
  }

  const filtered = applyFilters(scored, params);
  const rankings = buildRankings(filtered, params.limit ?? 25);

  return { resultCount: filtered.length, center, ...rankings };
}
