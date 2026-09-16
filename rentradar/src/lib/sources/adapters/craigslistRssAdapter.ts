import type { SourceAdapter, SourceAdapterConfig } from "@/lib/sources/types";
import type { NormalizedListing } from "@/types/listing";

// Craigslist search-results pages expose an official RSS feed link
// (?format=rss) for personal, non-commercial use. Before enabling this in a
// commercial deployment, review Craigslist's Terms of Use and, if needed,
// their exception process (craigslist requires written permission for most
// automated/commercial access) -- see docs/LEGAL_AND_DATA_SOURCES.md.
// `legallyIntegrated: false` below reflects that this needs a signed-off
// legal review before it runs against production traffic; the registry
// keeps it disabled by default.

function extractTag(xml: string, tag: string): string | undefined {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return match?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, "").trim();
}

function parseItems(xml: string): string[] {
  return xml.match(/<item>[\s\S]*?<\/item>/gi) ?? [];
}

function parsePriceCents(title: string): number | undefined {
  const match = title.match(/\$([\d,]+)/);
  if (!match?.[1]) return undefined;
  return Math.round(parseFloat(match[1].replace(/,/g, "")) * 100);
}

function parseBedrooms(title: string): number {
  const match = title.match(/(\d+)\s*br/i);
  return match?.[1] ? Number(match[1]) : 0;
}

function itemToListing(itemXml: string, city: string, state: string): NormalizedListing | null {
  const title = extractTag(itemXml, "title");
  const link = extractTag(itemXml, "link");
  const description = extractTag(itemXml, "description");
  const pubDate = extractTag(itemXml, "pubDate");
  if (!title || !link) return null;

  const rentCents = parsePriceCents(title);
  if (!rentCents) return null;

  const bedrooms = parseBedrooms(title);
  const idMatch = link.match(/\/(\d+)\.html/);

  return {
    externalId: idMatch?.[1] ?? link,
    sourceName: "craigslist-rss",
    sourceType: "CLASSIFIED",
    title: title.replace(/\$[\d,]+/, "").trim(),
    description,
    city,
    state,
    zipCode: "",
    monthlyRentCents: rentCents,
    bedrooms,
    category: bedrooms >= 2 ? "TWO_BEDROOM" : bedrooms === 1 ? "ONE_BEDROOM" : "STUDIO",
    listingUrl: link,
    foundAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
  };
}

export const craigslistRssAdapter: SourceAdapter = {
  meta: {
    name: "craigslist-rss",
    legallyIntegrated: false,
    requiresApiKey: false,
    notes:
      "Uses Craigslist's official RSS feed for search results. Craigslist's Terms of Use require written permission for commercial/automated use beyond personal browsing -- get that sign-off before enabling this adapter in production.",
  },
  async fetchListings(config: SourceAdapterConfig): Promise<NormalizedListing[]> {
    if (!config.city) return [];
    // Subdomain resolution (which craigslist site covers a given city) is a
    // small lookup table maintained separately; omitted here for brevity.
    const subdomain = process.env.CRAIGSLIST_SUBDOMAIN;
    if (!subdomain) return [];

    const url = new URL(`https://${subdomain}.craigslist.org/search/hhh`);
    url.searchParams.set("format", "rss");
    if (config.maxRentCents) url.searchParams.set("max_price", String(Math.floor(config.maxRentCents / 100)));
    if (config.minBedrooms) url.searchParams.set("min_bedrooms", String(config.minBedrooms));

    const res = await fetch(url.toString(), { headers: { "User-Agent": "RentRadarBot/1.0 (+contact@rentradar.app)" } });
    if (!res.ok) return [];

    const xml = await res.text();
    return parseItems(xml)
      .map((item) => itemToListing(item, config.city ?? "", config.state ?? ""))
      .filter((l): l is NormalizedListing => l !== null);
  },
};
