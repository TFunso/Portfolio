import { describe, expect, it } from "vitest";
import { applyFilters, buildRankings, scoreListings, sortByTotalMoveInCost } from "@/lib/aggregation/rank";
import type { NormalizedListing } from "@/types/listing";

function listing(overrides: Partial<NormalizedListing>): NormalizedListing {
  return {
    externalId: Math.random().toString(36).slice(2),
    sourceName: "test-source",
    sourceType: "MANUAL",
    title: "Test Listing",
    city: "Columbus",
    state: "OH",
    zipCode: "43215",
    addressLine1: "1 Test Way",
    monthlyRentCents: 100000,
    bedrooms: 1,
    category: "ONE_BEDROOM",
    listingUrl: "https://example.invalid/x",
    foundAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("scoreListings + sortByTotalMoveInCost", () => {
  it("sorts by total move-in cost, not just rent", () => {
    const cheapRentHighDeposit = listing({ monthlyRentCents: 50000, securityDepositCents: 200000, addressLine1: "A" });
    const higherRentNoDeposit = listing({ monthlyRentCents: 90000, securityDepositCents: 0, addressLine1: "B" });

    const scored = scoreListings([cheapRentHighDeposit, higherRentNoDeposit]);
    const sorted = sortByTotalMoveInCost(scored);

    expect(sorted[0]?.addressLine1).toBe("B");
    expect(sorted[0]!.totalMoveInCostCents).toBeLessThan(sorted[1]!.totalMoveInCostCents);
  });

  it("flags and can exclude listings that look like scams", () => {
    const scammy = listing({
      addressLine1: undefined,
      description: "Send deposit via wire transfer before viewing, owner overseas.",
      monthlyRentCents: 5000,
    });
    const legit = listing({ monthlyRentCents: 95000 });

    const scored = scoreListings([scammy, legit]);
    const flagged = scored.find((l) => l.title === "Test Listing" && l.scamFlags.length > 0);
    expect(flagged).toBeDefined();
    expect(flagged!.scamRiskScore).toBeGreaterThan(0);

    const filtered = applyFilters(scored, {});
    expect(filtered.some((l) => l.scamRiskScore >= 50)).toBe(false);
  });
});

describe("buildRankings", () => {
  it("produces cheapest-overall and cheapest-per-category lists", () => {
    const studio = listing({ category: "STUDIO", monthlyRentCents: 70000, addressLine1: "S1" });
    const oneBed = listing({ category: "ONE_BEDROOM", monthlyRentCents: 95000, addressLine1: "O1" });
    const cheaperOneBed = listing({ category: "ONE_BEDROOM", monthlyRentCents: 85000, addressLine1: "O2" });

    const scored = scoreListings([studio, oneBed, cheaperOneBed]);
    const rankings = buildRankings(scored);

    expect(rankings.cheapestOverall[0]?.addressLine1).toBe("S1");
    expect(rankings.cheapestByCategory.ONE_BEDROOM[0]?.addressLine1).toBe("O2");
  });
});
