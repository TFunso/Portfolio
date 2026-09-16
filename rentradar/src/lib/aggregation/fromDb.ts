import type { Listing as DbListing } from "@prisma/client";
import type { ScoredListing } from "@/types/listing";

type DbListingWithSource = DbListing & { source: { name: string } };

/** Maps a persisted Listing row (already scored by the ingestion worker) into
 *  the ScoredListing shape the ranking/filter utilities operate on. Callers
 *  must `include: { source: true }` in their Prisma query. */
export function dbListingToScored(row: DbListingWithSource): ScoredListing {
  return {
    id: row.id,
    externalId: row.externalId,
    sourceName: row.source.name,
    sourceType: row.sourceType,
    title: row.title,
    description: row.description ?? undefined,
    addressLine1: row.addressLine1 ?? undefined,
    city: row.city,
    state: row.state,
    zipCode: row.zipCode,
    latitude: row.latitude ?? undefined,
    longitude: row.longitude ?? undefined,
    monthlyRentCents: row.monthlyRent,
    securityDepositCents: row.securityDeposit ?? undefined,
    applicationFeeCents: row.applicationFee ?? undefined,
    otherMoveInFeesCents: row.otherMoveInFees ?? undefined,
    utilitiesIncluded: row.utilitiesIncluded,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms ?? undefined,
    squareFeet: row.squareFeet ?? undefined,
    category: row.category,
    petFriendly: row.petFriendly ?? undefined,
    parkingAvailable: row.parkingAvailable ?? undefined,
    furnished: row.furnished ?? undefined,
    shortTermLease: row.shortTermLease ?? undefined,
    noCreditCheck: row.noCreditCheck ?? undefined,
    lowDeposit: row.lowDeposit ?? undefined,
    availableFrom: row.availableFrom?.toISOString(),
    listingUrl: row.listingUrl,
    contactName: row.contactName ?? undefined,
    contactPhone: row.contactPhone ?? undefined,
    contactEmail: row.contactEmail ?? undefined,
    contactFormUrl: row.contactFormUrl ?? undefined,
    officeHours: row.officeHours ?? undefined,
    foundAt: row.firstSeenAt.toISOString(),
    totalMoveInCostCents: row.totalMoveInCost ?? row.monthlyRent,
    qualityScore: row.qualityScore ?? 50,
    scamRiskScore: row.scamRiskScore ?? 0,
    scamFlags: row.scamFlags,
  };
}
