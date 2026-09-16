import type { SourceAdapter, SourceAdapterConfig } from "@/lib/sources/types";
import type { NormalizedListing } from "@/types/listing";
import { checkRobotsTxt } from "@/lib/robots";

// Many independent property management companies mark up their vacancy
// pages with schema.org structured data (Apartment/Residence/Offer) for SEO.
// That's public data the site owner intentionally publishes for indexing,
// so this adapter is the "local property management websites" source --
// but it still checks robots.txt per-site before fetching, and only runs
// against sites explicitly registered in PROPERTY_MANAGER_SITE_URLS.

interface JsonLdOffer {
  "@type"?: string;
  price?: string | number;
  priceCurrency?: string;
  url?: string;
}

interface JsonLdApartment {
  "@type"?: string | string[];
  name?: string;
  description?: string;
  numberOfBedrooms?: number;
  numberOfBathroomsTotal?: number;
  floorSize?: { value?: number };
  address?: {
    streetAddress?: string;
    addressLocality?: string;
    addressRegion?: string;
    postalCode?: string;
  };
  offers?: JsonLdOffer | JsonLdOffer[];
  telephone?: string;
  url?: string;
}

function extractJsonLdBlocks(html: string): JsonLdApartment[] {
  const blocks: JsonLdApartment[] = [];
  const regex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(match[1]?.trim() ?? "");
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        const types = Array.isArray(item["@type"]) ? item["@type"] : [item["@type"]];
        if (types.some((t: string) => ["Apartment", "Residence", "House", "SingleFamilyResidence"].includes(t))) {
          blocks.push(item);
        }
      }
    } catch {
      // Malformed JSON-LD on the page; skip this block rather than fail the crawl.
    }
  }
  return blocks;
}

function firstOffer(offers?: JsonLdOffer | JsonLdOffer[]): JsonLdOffer | undefined {
  if (!offers) return undefined;
  return Array.isArray(offers) ? offers[0] : offers;
}

function toNormalized(item: JsonLdApartment, pageUrl: string): NormalizedListing | null {
  const offer = firstOffer(item.offers);
  const rent = offer?.price ? Number(offer.price) : undefined;
  if (!rent || !item.address?.addressLocality) return null;

  const bedrooms = item.numberOfBedrooms ?? 0;
  return {
    externalId: item.url ?? pageUrl,
    sourceName: new URL(pageUrl).hostname,
    sourceType: "PROPERTY_MANAGER_SITE",
    title: item.name ?? "Available Rental",
    description: item.description,
    addressLine1: item.address.streetAddress,
    city: item.address.addressLocality,
    state: item.address.addressRegion ?? "",
    zipCode: item.address.postalCode ?? "",
    monthlyRentCents: Math.round(rent * 100),
    bedrooms,
    bathrooms: item.numberOfBathroomsTotal,
    squareFeet: item.floorSize?.value,
    category: bedrooms >= 2 ? "TWO_BEDROOM" : bedrooms === 1 ? "ONE_BEDROOM" : "STUDIO",
    listingUrl: item.url ?? pageUrl,
    contactPhone: item.telephone,
    foundAt: new Date().toISOString(),
  };
}

export const jsonLdSiteAdapter: SourceAdapter = {
  meta: {
    name: "property-manager-json-ld",
    legallyIntegrated: true,
    requiresApiKey: false,
    notes:
      "Reads schema.org structured data from registered property-management sites after checking robots.txt on each fetch. Add sites via PROPERTY_MANAGER_SITE_URLS.",
  },
  async fetchListings(_config: SourceAdapterConfig): Promise<NormalizedListing[]> {
    const urls = (process.env.PROPERTY_MANAGER_SITE_URLS ?? "")
      .split(",")
      .map((u) => u.trim())
      .filter(Boolean);
    if (urls.length === 0) return [];

    const results: NormalizedListing[] = [];
    for (const pageUrl of urls) {
      const parsed = new URL(pageUrl);
      const robots = await checkRobotsTxt(parsed.origin, parsed.pathname);
      if (!robots.allowed) continue;

      const res = await fetch(pageUrl, { headers: { "User-Agent": "RentRadarBot/1.0 (+contact@rentradar.app)" } });
      if (!res.ok) continue;

      const html = await res.text();
      for (const block of extractJsonLdBlocks(html)) {
        const listing = toNormalized(block, pageUrl);
        if (listing) results.push(listing);
      }

      if (robots.crawlDelaySeconds) {
        await new Promise((r) => setTimeout(r, robots.crawlDelaySeconds! * 1000));
      }
    }
    return results;
  },
};
