import type { NormalizedListing } from "@/types/listing";

export interface SourceAdapterConfig {
  /** Search center; adapters that support geo APIs use this directly. */
  city?: string;
  state?: string;
  zipCode?: string;
  latitude?: number;
  longitude?: number;
  radiusMiles: number;
  maxRentCents?: number;
  minBedrooms?: number;
}

export interface SourceAdapterMeta {
  name: string;
  /** True only for sources RentRadar is permitted to pull from today
   *  (official API, licensed feed, robots.txt-permitting site, or public dataset).
   *  See docs/LEGAL_AND_DATA_SOURCES.md for the compliance rationale per source. */
  legallyIntegrated: boolean;
  requiresApiKey: boolean;
  notes?: string;
}

export interface SourceAdapter {
  meta: SourceAdapterMeta;
  fetchListings(config: SourceAdapterConfig): Promise<NormalizedListing[]>;
}
