import type { NormalizedListing } from "@/types/listing";

/**
 * Rental "quality" score (0-100): how complete and trustworthy a listing's
 * data is, independent of price. Used as a tiebreaker in ranking and to
 * warn users off thin listings, not to penalize genuinely cheap rentals.
 */
export function scoreQuality(listing: NormalizedListing): number {
  let score = 40; // baseline for having made it into the index at all

  if (listing.description && listing.description.length > 40) score += 10;
  if (listing.addressLine1) score += 10;
  if (listing.latitude != null && listing.longitude != null) score += 10;
  if (listing.contactPhone) score += 8;
  if (listing.contactEmail) score += 6;
  if (listing.contactName) score += 6;
  if (listing.squareFeet) score += 5;
  if (listing.availableFrom) score += 5;
  if (listing.officeHours) score += 5;

  const ageHours = (Date.now() - new Date(listing.foundAt).getTime()) / (1000 * 60 * 60);
  if (ageHours > 24 * 30) score -= 15; // stale listing, likely rented already

  return Math.max(0, Math.min(100, score));
}
