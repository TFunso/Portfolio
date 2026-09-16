import { describe, expect, it } from "vitest";
import { dedupeListings } from "@/lib/aggregation/dedupe";
import type { NormalizedListing } from "@/types/listing";

function listing(overrides: Partial<NormalizedListing>): NormalizedListing {
  return {
    externalId: "1",
    sourceName: "test-source",
    sourceType: "MANUAL",
    title: "Test Listing",
    city: "Columbus",
    state: "OH",
    zipCode: "43215",
    monthlyRentCents: 100000,
    bedrooms: 1,
    category: "ONE_BEDROOM",
    listingUrl: "https://example.invalid/1",
    foundAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("dedupeListings", () => {
  it("collapses the same address posted on two sources into one listing", () => {
    const a = listing({ sourceName: "site-a", externalId: "a1", addressLine1: "123 Main St", contactPhone: "614-555-0101" });
    const b = listing({ sourceName: "site-b", externalId: "b1", addressLine1: "123 Main St", monthlyRentCents: 100100 });

    const result = dedupeListings([a, b]);
    expect(result).toHaveLength(1);
  });

  it("keeps distinct addresses separate", () => {
    const a = listing({ addressLine1: "123 Main St" });
    const b = listing({ externalId: "2", addressLine1: "456 Oak Ave" });

    const result = dedupeListings([a, b]);
    expect(result).toHaveLength(2);
  });

  it("prefers the more complete record when merging duplicates", () => {
    const thin = listing({ sourceName: "site-a", addressLine1: "123 Main St" });
    const rich = listing({
      sourceName: "site-b",
      addressLine1: "123 Main St",
      contactPhone: "614-555-0101",
      contactEmail: "leasing@example.invalid",
      description: "A lovely apartment with plenty of detail.",
    });

    const [winner] = dedupeListings([thin, rich]);
    expect(winner?.sourceName).toBe("site-b");
  });

  it("falls back to phone+bedrooms+rent when there is no address", () => {
    const a = listing({ sourceName: "craigslist", externalId: "c1", contactPhone: "(614) 555-0199" });
    const b = listing({ sourceName: "facebook", externalId: "f1", contactPhone: "6145550199" });

    const result = dedupeListings([a, b]);
    expect(result).toHaveLength(1);
  });
});
