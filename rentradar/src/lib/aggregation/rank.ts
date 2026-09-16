import type { NormalizedListing, RentalCategory, ScoredListing } from "@/types/listing";
import { totalMoveInCostCents } from "@/types/listing";
import { dedupeListings } from "@/lib/aggregation/dedupe";
import { scoreScamRisk, SCAM_REVIEW_THRESHOLD } from "@/lib/aggregation/scam";
import { scoreQuality } from "@/lib/aggregation/qualityScore";

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2 : sorted[mid] ?? 0;
}

/** Dedupe, score, and attach a stable id to every listing. Excludes nothing --
 *  callers decide whether to surface NEEDS_REVIEW-worthy (high scam-risk) listings. */
export function scoreListings(rawListings: NormalizedListing[]): ScoredListing[] {
  const deduped = dedupeListings(rawListings);
  const marketMedianRentCents = median(deduped.map((l) => l.monthlyRentCents));

  return deduped.map((l) => {
    const scam = scoreScamRisk(l, marketMedianRentCents);
    return {
      ...l,
      id: `${l.sourceName}:${l.externalId}`,
      totalMoveInCostCents: totalMoveInCostCents(l),
      qualityScore: scoreQuality(l),
      scamRiskScore: scam.score,
      scamFlags: scam.flags,
    };
  });
}

export interface RankingFilters {
  maxRentCents?: number;
  petFriendly?: boolean;
  parkingAvailable?: boolean;
  furnished?: boolean;
  shortTermLease?: boolean;
  noCreditCheck?: boolean;
  lowDeposit?: boolean;
  utilitiesIncluded?: boolean;
  excludeHighScamRisk?: boolean; // default true
}

export function applyFilters(listings: ScoredListing[], filters: RankingFilters): ScoredListing[] {
  const excludeHighScamRisk = filters.excludeHighScamRisk ?? true;
  return listings.filter((l) => {
    if (excludeHighScamRisk && l.scamRiskScore >= SCAM_REVIEW_THRESHOLD) return false;
    if (filters.maxRentCents != null && l.monthlyRentCents > filters.maxRentCents) return false;
    if (filters.petFriendly && !l.petFriendly) return false;
    if (filters.parkingAvailable && !l.parkingAvailable) return false;
    if (filters.furnished && !l.furnished) return false;
    if (filters.shortTermLease && !l.shortTermLease) return false;
    if (filters.noCreditCheck && !l.noCreditCheck) return false;
    if (filters.lowDeposit && !l.lowDeposit) return false;
    if (filters.utilitiesIncluded && !l.utilitiesIncluded) return false;
    return true;
  });
}

/** Sort by total move-in cost ascending (the product's core promise: cheapest first). */
export function sortByTotalMoveInCost(listings: ScoredListing[]): ScoredListing[] {
  return [...listings].sort((a, b) => a.totalMoveInCostCents - b.totalMoveInCostCents);
}

export interface CheapestRankings {
  cheapestOverall: ScoredListing[];
  cheapestByCategory: Record<RentalCategory, ScoredListing[]>;
}

const ALL_CATEGORIES: RentalCategory[] = [
  "STUDIO",
  "ONE_BEDROOM",
  "TWO_BEDROOM",
  "THREE_PLUS_BEDROOM",
  "PRIVATE_ROOM",
  "HOUSE_SHARE",
  "ROOMMATE",
];

export function buildRankings(listings: ScoredListing[], topN = 25): CheapestRankings {
  const sorted = sortByTotalMoveInCost(listings);

  const cheapestByCategory = ALL_CATEGORIES.reduce((acc, category) => {
    acc[category] = sorted.filter((l) => l.category === category).slice(0, topN);
    return acc;
  }, {} as Record<RentalCategory, ScoredListing[]>);

  return {
    cheapestOverall: sorted.slice(0, topN),
    cheapestByCategory,
  };
}
