import type { SourceAdapter, SourceAdapterConfig } from "@/lib/sources/types";
import type { NormalizedListing } from "@/types/listing";
import { mockAdapter } from "@/lib/sources/adapters/mockAdapter";
import { hudAffordableHousingAdapter } from "@/lib/sources/adapters/hudAffordableHousingAdapter";
import { craigslistRssAdapter } from "@/lib/sources/adapters/craigslistRssAdapter";
import { jsonLdSiteAdapter } from "@/lib/sources/adapters/jsonLdSiteAdapter";

// The full list of adapters RentRadar ships with. `legallyIntegrated: false`
// adapters are excluded from `activeAdapters()` until a legal/partnership
// review flips that flag -- see docs/LEGAL_AND_DATA_SOURCES.md for the
// per-source status of every platform named in the product brief
// (Apartments.com, Zillow, Rent.com, Realtor.com, Facebook Marketplace,
// PadMapper, HotPads, Zumper, RentCafe, etc. all require a commercial data
// license or partner API that isn't wired up in this OSS scaffold).
export const allAdapters: SourceAdapter[] = [
  mockAdapter,
  hudAffordableHousingAdapter,
  craigslistRssAdapter,
  jsonLdSiteAdapter,
];

export function activeAdapters(): SourceAdapter[] {
  const useMock = process.env.NODE_ENV !== "production" || process.env.RENTRADAR_USE_MOCK_DATA === "true";
  return allAdapters.filter((a) => a.meta.legallyIntegrated && (a.meta.name !== "rentradar-mock" || useMock));
}

export async function fetchAllListings(config: SourceAdapterConfig): Promise<NormalizedListing[]> {
  const adapters = activeAdapters();
  const results = await Promise.allSettled(adapters.map((a) => a.fetchListings(config)));

  const listings: NormalizedListing[] = [];
  results.forEach((r, i) => {
    if (r.status === "fulfilled") {
      listings.push(...r.value);
    } else {
      console.error(`Adapter ${adapters[i]?.meta.name} failed:`, r.reason);
    }
  });
  return listings;
}
