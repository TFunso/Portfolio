import type { NormalizedListing } from "@/types/listing";

export interface ScamAssessment {
  score: number; // 0-100, higher = riskier
  flags: string[];
}

const WIRE_TRANSFER_TERMS = ["wire transfer", "western union", "moneygram", "gift card", "cash app only", "zelle only"];
const URGENCY_TERMS = ["send deposit today", "before viewing", "owner overseas", "owner is out of the country", "act now"];
const FAKE_PHONE_PATTERN = /^(\+1)?(555|000|111)\d{7}$/;

/**
 * Heuristic anti-scam scoring. This runs synchronously on every ingested
 * listing (see workers/rentHunter.ts); it is intentionally simple/explainable
 * rather than a black-box model, so flags can be shown to users and tuned.
 */
export function scoreScamRisk(listing: NormalizedListing, marketMedianRentCents?: number): ScamAssessment {
  const flags: string[] = [];
  let score = 0;

  const text = `${listing.title} ${listing.description ?? ""}`.toLowerCase();

  for (const term of WIRE_TRANSFER_TERMS) {
    if (text.includes(term)) {
      flags.push(`payment_method:${term}`);
      score += 35;
    }
  }
  for (const term of URGENCY_TERMS) {
    if (text.includes(term)) {
      flags.push(`urgency_language:${term}`);
      score += 20;
    }
  }

  const phoneDigits = listing.contactPhone?.replace(/[^\d+]/g, "");
  if (phoneDigits && FAKE_PHONE_PATTERN.test(phoneDigits)) {
    flags.push("suspicious_phone_number");
    score += 25;
  }
  if (!listing.contactPhone && !listing.contactEmail && !listing.contactFormUrl) {
    flags.push("no_contact_method");
    score += 15;
  }

  if (marketMedianRentCents && marketMedianRentCents > 0) {
    const ratio = listing.monthlyRentCents / marketMedianRentCents;
    if (ratio < 0.4) {
      flags.push(`price_far_below_market:${ratio.toFixed(2)}x`);
      score += 30;
    }
  }

  if (!listing.addressLine1 && listing.sourceType === "CLASSIFIED") {
    flags.push("no_specific_address");
    score += 10;
  }

  return { score: Math.min(100, score), flags };
}

export const SCAM_REVIEW_THRESHOLD = 50;
