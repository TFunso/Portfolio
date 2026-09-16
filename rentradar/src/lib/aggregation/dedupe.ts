import type { NormalizedListing } from "@/types/listing";

function normalizeAddress(l: NormalizedListing): string {
  const street = (l.addressLine1 ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
  return `${street}|${l.zipCode}`;
}

function normalizePhone(phone?: string): string | undefined {
  const digits = phone?.replace(/\D/g, "");
  return digits && digits.length >= 10 ? digits.slice(-10) : undefined;
}

/**
 * Cross-source dedupe key. The same unit is frequently posted to several
 * marketplaces (or reposted by the same landlord); we key on address+rent
 * when we have an address, falling back to phone+rent+bedrooms when we
 * don't (common for classifieds without a street address).
 */
export function dedupeKey(l: NormalizedListing): string {
  const rentBucket = Math.round(l.monthlyRentCents / 2500) * 2500; // tolerate small price differences across sites
  if (l.addressLine1) {
    return `addr:${normalizeAddress(l)}:${rentBucket}`;
  }
  const phone = normalizePhone(l.contactPhone);
  if (phone) {
    return `phone:${phone}:${l.bedrooms}:${rentBucket}`;
  }
  return `url:${l.listingUrl}`;
}

/**
 * Collapse duplicate postings of the same unit across sources, keeping the
 * most complete/most recent record and merging which sources saw it.
 */
export function dedupeListings(listings: NormalizedListing[]): NormalizedListing[] {
  const groups = new Map<string, NormalizedListing[]>();
  for (const l of listings) {
    const key = dedupeKey(l);
    const group = groups.get(key) ?? [];
    group.push(l);
    groups.set(key, group);
  }

  const result: NormalizedListing[] = [];
  for (const group of groups.values()) {
    const winner = group.reduce((best, candidate) => {
      const bestCompleteness = completeness(best);
      const candidateCompleteness = completeness(candidate);
      if (candidateCompleteness !== bestCompleteness) {
        return candidateCompleteness > bestCompleteness ? candidate : best;
      }
      return new Date(candidate.foundAt) > new Date(best.foundAt) ? candidate : best;
    });
    result.push(winner);
  }
  return result;
}

function completeness(l: NormalizedListing): number {
  return [
    l.addressLine1,
    l.contactPhone,
    l.contactEmail,
    l.description,
    l.latitude != null,
    l.squareFeet,
  ].filter(Boolean).length;
}
