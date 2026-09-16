// Normalized shape every source adapter must produce, independent of Prisma,
// so aggregation/ranking logic and its tests don't need a live database.

export type RentalCategory =
  | "STUDIO"
  | "ONE_BEDROOM"
  | "TWO_BEDROOM"
  | "THREE_PLUS_BEDROOM"
  | "PRIVATE_ROOM"
  | "HOUSE_SHARE"
  | "ROOMMATE";

export type ListingSourceType =
  | "MAJOR_MARKETPLACE"
  | "CLASSIFIED"
  | "AFFORDABLE_HOUSING"
  | "PROPERTY_MANAGER_SITE"
  | "UNIVERSITY_HOUSING"
  | "ROOM_RENTAL_PLATFORM"
  | "PUBLIC_FEED"
  | "MANUAL";

export interface NormalizedListing {
  /** Stable id on the origin site; combined with sourceName for dedupe key. */
  externalId: string;
  sourceName: string;
  sourceType: ListingSourceType;

  title: string;
  description?: string;

  addressLine1?: string;
  city: string;
  state: string;
  zipCode: string;
  latitude?: number;
  longitude?: number;

  /** All money fields are integer cents (USD) to avoid float rounding bugs. */
  monthlyRentCents: number;
  securityDepositCents?: number;
  applicationFeeCents?: number;
  otherMoveInFeesCents?: number;
  utilitiesIncluded?: boolean;

  bedrooms: number;
  bathrooms?: number;
  squareFeet?: number;
  category: RentalCategory;

  petFriendly?: boolean;
  parkingAvailable?: boolean;
  furnished?: boolean;
  shortTermLease?: boolean;
  noCreditCheck?: boolean;
  lowDeposit?: boolean;

  availableFrom?: string; // ISO date
  listingUrl: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  contactFormUrl?: string;
  officeHours?: string;

  foundAt: string; // ISO datetime the adapter observed this listing
}

export interface ScoredListing extends NormalizedListing {
  id: string;
  totalMoveInCostCents: number;
  qualityScore: number; // 0-100
  scamRiskScore: number; // 0-100, higher = riskier
  scamFlags: string[];
}

export function totalMoveInCostCents(
  l: Pick<
    NormalizedListing,
    "monthlyRentCents" | "securityDepositCents" | "applicationFeeCents" | "otherMoveInFeesCents"
  >,
): number {
  return (
    l.monthlyRentCents +
    (l.securityDepositCents ?? 0) +
    (l.applicationFeeCents ?? 0) +
    (l.otherMoveInFeesCents ?? 0)
  );
}

export const CATEGORY_LABELS: Record<RentalCategory, string> = {
  STUDIO: "Studio",
  ONE_BEDROOM: "1 Bedroom",
  TWO_BEDROOM: "2 Bedroom",
  THREE_PLUS_BEDROOM: "3+ Bedroom",
  PRIVATE_ROOM: "Private Room",
  HOUSE_SHARE: "House Share",
  ROOMMATE: "Roommate",
};

export function categoryFromBedrooms(bedrooms: number, isShared: boolean): RentalCategory {
  if (isShared) return bedrooms <= 0 ? "PRIVATE_ROOM" : "HOUSE_SHARE";
  if (bedrooms <= 0) return "STUDIO";
  if (bedrooms === 1) return "ONE_BEDROOM";
  if (bedrooms === 2) return "TWO_BEDROOM";
  return "THREE_PLUS_BEDROOM";
}
