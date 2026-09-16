import { describe, expect, it } from "vitest";
import { calculateAffordability } from "@/lib/affordability/calculator";

describe("calculateAffordability", () => {
  it("marks rent at exactly 30% of income as comfortable", () => {
    const result = calculateAffordability({
      annualIncomeCents: 6000000, // $60,000
      monthlyRentCents: 150000, // $1,500 = 30% of $5,000/mo income
    });
    expect(result.band).toBe("comfortable");
    expect(result.affordabilityScore).toBeGreaterThanOrEqual(84);
  });

  it("marks rent far above income as unaffordable with a low score", () => {
    const result = calculateAffordability({
      annualIncomeCents: 2400000, // $24,000/yr -> $2,000/mo
      monthlyRentCents: 180000, // $1,800/mo -> 90% ratio
    });
    expect(result.band).toBe("unaffordable");
    expect(result.affordabilityScore).toBeLessThan(15);
  });

  it("excludes utilities from the total when they're included in rent", () => {
    const result = calculateAffordability({
      annualIncomeCents: 6000000,
      monthlyRentCents: 150000,
      utilitiesIncluded: true,
    });
    expect(result.estimatedMonthlyUtilitiesCents).toBe(0);
  });

  it("adds deposit and fees into total move-in cost but not into monthly housing cost", () => {
    const result = calculateAffordability({
      annualIncomeCents: 6000000,
      monthlyRentCents: 150000,
      securityDepositCents: 150000,
      applicationFeeCents: 5000,
    });
    expect(result.totalMoveInCostCents).toBe(305000);
    expect(result.totalMonthlyHousingCostCents).toBeLessThan(result.totalMoveInCostCents);
  });
});
