export interface AffordabilityInput {
  annualIncomeCents: number;
  monthlyRentCents: number;
  securityDepositCents?: number;
  applicationFeeCents?: number;
  otherMoveInFeesCents?: number;
  utilitiesIncluded?: boolean;
  estimatedMonthlyUtilitiesCents?: number; // used only when utilitiesIncluded is false
  estimatedMonthlyTransitCents?: number;
}

export interface AffordabilityResult {
  recommendedMaxRentCents: number; // classic 30%-of-income guideline
  monthlyIncomeCents: number;
  rentToIncomeRatio: number; // 0-1+
  totalMoveInCostCents: number;
  estimatedMonthlyUtilitiesCents: number;
  estimatedMonthlyTransitCents: number;
  totalMonthlyHousingCostCents: number; // rent + utilities + transit
  /** 0-100. 100 = comfortably affordable, 0 = badly over-budget. */
  affordabilityScore: number;
  band: "comfortable" | "tight" | "stretched" | "unaffordable";
}

const DEFAULT_UTILITIES_CENTS = 15000; // $150/mo, rough national average for a small unit
const DEFAULT_TRANSIT_CENTS = 10000; // $100/mo

export function calculateAffordability(input: AffordabilityInput): AffordabilityResult {
  const monthlyIncomeCents = Math.round(input.annualIncomeCents / 12);
  const recommendedMaxRentCents = Math.round(monthlyIncomeCents * 0.3);

  const estimatedMonthlyUtilitiesCents = input.utilitiesIncluded
    ? 0
    : input.estimatedMonthlyUtilitiesCents ?? DEFAULT_UTILITIES_CENTS;
  const estimatedMonthlyTransitCents = input.estimatedMonthlyTransitCents ?? DEFAULT_TRANSIT_CENTS;

  const totalMoveInCostCents =
    input.monthlyRentCents +
    (input.securityDepositCents ?? 0) +
    (input.applicationFeeCents ?? 0) +
    (input.otherMoveInFeesCents ?? 0);

  const totalMonthlyHousingCostCents =
    input.monthlyRentCents + estimatedMonthlyUtilitiesCents + estimatedMonthlyTransitCents;

  const rentToIncomeRatio = monthlyIncomeCents > 0 ? input.monthlyRentCents / monthlyIncomeCents : Infinity;

  // Score decays smoothly past the 30% guideline rather than cliff-edging at it.
  let affordabilityScore: number;
  if (rentToIncomeRatio <= 0.3) {
    affordabilityScore = 100 - (rentToIncomeRatio / 0.3) * 15; // 85-100
  } else if (rentToIncomeRatio <= 0.5) {
    affordabilityScore = 85 - ((rentToIncomeRatio - 0.3) / 0.2) * 35; // 50-85
  } else if (rentToIncomeRatio <= 0.7) {
    affordabilityScore = 50 - ((rentToIncomeRatio - 0.5) / 0.2) * 35; // 15-50
  } else {
    affordabilityScore = Math.max(0, 15 - (rentToIncomeRatio - 0.7) * 20);
  }

  const band: AffordabilityResult["band"] =
    rentToIncomeRatio <= 0.3 ? "comfortable" : rentToIncomeRatio <= 0.5 ? "tight" : rentToIncomeRatio <= 0.7 ? "stretched" : "unaffordable";

  return {
    recommendedMaxRentCents,
    monthlyIncomeCents,
    rentToIncomeRatio,
    totalMoveInCostCents,
    estimatedMonthlyUtilitiesCents,
    estimatedMonthlyTransitCents,
    totalMonthlyHousingCostCents,
    affordabilityScore: Math.round(Math.max(0, Math.min(100, affordabilityScore))),
    band,
  };
}
