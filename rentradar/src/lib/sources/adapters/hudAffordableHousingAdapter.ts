import type { SourceAdapter, SourceAdapterConfig } from "@/lib/sources/types";
import type { NormalizedListing } from "@/types/listing";

// HUD publishes public, licensable open datasets (e.g. the HUD USER Picture
// of Subsidized Households, and per-PHA "Affordable Housing" feeds many
// housing authorities expose). This adapter calls a configured, official
// endpoint rather than scraping HUD's site. It is a no-op until
// HUD_API_TOKEN / HUD_AFFORDABLE_HOUSING_ENDPOINT are configured, so the
// app runs without it and never fabricates listings.
//
// See docs/LEGAL_AND_DATA_SOURCES.md for the specific datasets to register
// for in production (HUD USER open data, state/local PHA feeds, Affordable
// Housing Online partner API, etc).

interface HudApiRecord {
  id: string;
  propertyName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  latitude?: number;
  longitude?: number;
  monthlyRentLow?: number; // dollars
  monthlyRentHigh?: number; // dollars
  bedrooms?: number;
  program?: string; // e.g. "Section 8", "LIHTC", "Senior", "Workforce"
  contactPhone?: string;
  contactEmail?: string;
  url?: string;
}

function toNormalized(rec: HudApiRecord): NormalizedListing {
  const rentDollars = rec.monthlyRentLow ?? rec.monthlyRentHigh ?? 0;
  return {
    externalId: rec.id,
    sourceName: "hud-affordable-housing",
    sourceType: "AFFORDABLE_HOUSING",
    title: `${rec.propertyName}${rec.program ? ` (${rec.program})` : ""}`,
    addressLine1: rec.address,
    city: rec.city,
    state: rec.state,
    zipCode: rec.zip,
    latitude: rec.latitude,
    longitude: rec.longitude,
    monthlyRentCents: Math.round(rentDollars * 100),
    bedrooms: rec.bedrooms ?? 0,
    category: rec.bedrooms && rec.bedrooms >= 1 ? "ONE_BEDROOM" : "STUDIO",
    lowDeposit: true,
    listingUrl: rec.url ?? `https://resources.hud.gov/`,
    contactPhone: rec.contactPhone,
    contactEmail: rec.contactEmail,
    foundAt: new Date().toISOString(),
  };
}

export const hudAffordableHousingAdapter: SourceAdapter = {
  meta: {
    name: "hud-affordable-housing",
    legallyIntegrated: true,
    requiresApiKey: true,
    notes:
      "Calls a configured official/open-data endpoint (HUD USER open data or a PHA feed). Returns [] until HUD_AFFORDABLE_HOUSING_ENDPOINT is set.",
  },
  async fetchListings(config: SourceAdapterConfig): Promise<NormalizedListing[]> {
    const endpoint = process.env.HUD_AFFORDABLE_HOUSING_ENDPOINT;
    if (!endpoint) return [];

    const url = new URL(endpoint);
    if (config.zipCode) url.searchParams.set("zip", config.zipCode);
    if (config.state) url.searchParams.set("state", config.state);
    url.searchParams.set("radiusMiles", String(config.radiusMiles));

    const headers: Record<string, string> = { Accept: "application/json" };
    if (process.env.HUD_API_TOKEN) headers.Authorization = `Bearer ${process.env.HUD_API_TOKEN}`;

    const res = await fetch(url.toString(), { headers });
    if (!res.ok) return [];

    const data = (await res.json()) as { records?: HudApiRecord[] };
    return (data.records ?? []).map(toNormalized);
  },
};
