// AI Rent Hunter: the background agent that keeps the listing index fresh.
//
// Run on a schedule (cron / GitHub Actions / a serverless scheduled
// function -- see docs/DEPLOYMENT.md) via `npm run hunter:run`. Each run:
//   1. Pulls listings from every legally-integrated source adapter.
//   2. Dedupes across sources and scores quality + scam risk.
//   3. Upserts into Postgres, recording price history and flagging
//      newly-posted vs. previously-seen listings.
//   4. Detects rent drops / new-listing matches against saved searches and
//      fires the notification pipeline (Twilio/SendGrid, currently no-op
//      without credentials).
//   5. Optionally asks Claude to double-check any listing whose heuristic
//      scam score is borderline, for a second, qualitative opinion.
//
// This intentionally runs everything through the pure functions in
// src/lib/aggregation/* so the scoring logic is identical whether it's
// exercised here, in the API route, or in the unit tests.

import { prisma } from "@/lib/db";
import { fetchAllListings } from "@/lib/sources/registry";
import { dedupeListings } from "@/lib/aggregation/dedupe";
import { scoreScamRisk, SCAM_REVIEW_THRESHOLD } from "@/lib/aggregation/scam";
import { scoreQuality } from "@/lib/aggregation/qualityScore";
import { totalMoveInCostCents, type NormalizedListing } from "@/types/listing";
import { sendEmail, rentDropEmail } from "@/lib/notifications/email";
import { sendSms } from "@/lib/notifications/sms";

const SEARCH_GRID: Array<{ city: string; state: string; radiusMiles: number }> = [
  { city: "Columbus", state: "OH", radiusMiles: 10 },
  // Add more metro areas here, or drive this from distinct SavedSearch rows.
];

async function assessWithClaude(listing: NormalizedListing): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 200,
        messages: [
          {
            role: "user",
            content:
              `Assess this rental listing for scam risk in one short paragraph. ` +
              `Title: ${listing.title}. Rent: $${(listing.monthlyRentCents / 100).toFixed(0)}/mo. ` +
              `Description: ${listing.description ?? "(none)"}. Contact: ${listing.contactEmail ?? listing.contactPhone ?? "(none)"}.`,
          },
        ],
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { content?: Array<{ text?: string }> };
    return data.content?.[0]?.text ?? null;
  } catch (err) {
    console.error("Claude assessment failed:", err);
    return null;
  }
}

async function upsertListing(listing: NormalizedListing, marketMedianRentCents: number) {
  const source = await prisma.source.upsert({
    where: { name: listing.sourceName },
    update: { lastCrawledAt: new Date() },
    create: { name: listing.sourceName, type: listing.sourceType, isEnabled: true },
  });

  const scam = scoreScamRisk(listing, marketMedianRentCents);
  const quality = scoreQuality(listing);

  const existing = await prisma.listing.findUnique({
    where: { sourceId_externalId: { sourceId: source.id, externalId: listing.externalId } },
  });

  const data = {
    title: listing.title,
    description: listing.description,
    addressLine1: listing.addressLine1,
    city: listing.city,
    state: listing.state,
    zipCode: listing.zipCode,
    latitude: listing.latitude,
    longitude: listing.longitude,
    monthlyRent: listing.monthlyRentCents,
    securityDeposit: listing.securityDepositCents,
    applicationFee: listing.applicationFeeCents,
    otherMoveInFees: listing.otherMoveInFeesCents,
    utilitiesIncluded: listing.utilitiesIncluded ?? false,
    bedrooms: listing.bedrooms,
    bathrooms: listing.bathrooms,
    squareFeet: listing.squareFeet,
    category: listing.category,
    petFriendly: listing.petFriendly,
    parkingAvailable: listing.parkingAvailable,
    furnished: listing.furnished,
    shortTermLease: listing.shortTermLease,
    noCreditCheck: listing.noCreditCheck,
    lowDeposit: listing.lowDeposit,
    availableFrom: listing.availableFrom ? new Date(listing.availableFrom) : null,
    listingUrl: listing.listingUrl,
    contactName: listing.contactName,
    contactPhone: listing.contactPhone,
    contactEmail: listing.contactEmail,
    contactFormUrl: listing.contactFormUrl,
    officeHours: listing.officeHours,
    totalMoveInCost: totalMoveInCostCents(listing),
    qualityScore: quality,
    scamRiskScore: scam.score,
    scamFlags: scam.flags,
    status: scam.score >= SCAM_REVIEW_THRESHOLD ? ("NEEDS_REVIEW" as const) : ("ACTIVE" as const),
    lastSeenAt: new Date(),
  };

  const isNewListing = !existing;
  const rentDropped = existing && data.monthlyRent < existing.monthlyRent;

  const row = await prisma.listing.upsert({
    where: { sourceId_externalId: { sourceId: source.id, externalId: listing.externalId } },
    update: data,
    create: { ...data, externalId: listing.externalId, sourceId: source.id, sourceType: listing.sourceType },
  });

  if (isNewListing || rentDropped) {
    await prisma.priceHistory.create({ data: { listingId: row.id, monthlyRent: data.monthlyRent } });
  }

  if (scam.score >= SCAM_REVIEW_THRESHOLD && scam.score < 80) {
    const opinion = await assessWithClaude(listing);
    if (opinion) console.log(`[rentHunter] Claude review for ${listing.externalId}: ${opinion}`);
  }

  return { row, isNewListing, rentDropped, previousRentCents: existing?.monthlyRent };
}

async function notifyMatchingAlerts(params: {
  listingId: string;
  city: string;
  zipCode: string;
  monthlyRentCents: number;
  triggerType: "NEW_MATCH" | "RENT_DROP";
  title: string;
  listingUrl: string;
  previousRentCents?: number;
}) {
  const alerts = await prisma.alert.findMany({
    where: {
      isActive: true,
      triggerType: params.triggerType === "RENT_DROP" ? "RENT_DROP" : { in: ["NEW_CHEAPER_LISTING", "NEW_MATCH"] },
      savedSearch: {
        OR: [{ location: params.city }, { location: params.zipCode }],
        maxRent: { gte: params.monthlyRentCents },
      },
    },
    include: { user: true, savedSearch: true },
  });

  for (const alert of alerts) {
    const reason =
      params.triggerType === "RENT_DROP"
        ? `rent_drop:${params.previousRentCents}->${params.monthlyRentCents}`
        : "new_match";

    await prisma.alertMatch.create({
      data: { alertId: alert.id, listingId: params.listingId, reason, notifiedAt: new Date() },
    });

    const url = params.listingUrl;
    if (alert.channel === "EMAIL" && alert.user.email) {
      await sendEmail({
        to: alert.user.email,
        subject: params.triggerType === "RENT_DROP" ? "Rent drop on a listing you're watching" : "New cheap listing match",
        html:
          params.triggerType === "RENT_DROP" && params.previousRentCents
            ? rentDropEmail(params.title, params.previousRentCents, params.monthlyRentCents, url)
            : `<p>New match: <strong>${params.title}</strong> at $${(params.monthlyRentCents / 100).toFixed(0)}/mo.</p><p><a href="${url}">View listing</a></p>`,
      });
    } else if (alert.channel === "SMS" && alert.user.phone) {
      await sendSms({ to: alert.user.phone, body: `RentRadar: ${params.title} - $${(params.monthlyRentCents / 100).toFixed(0)}/mo. ${url}` });
    }
    // PUSH delivery goes through the web/mobile push provider wired up in the client app.
  }
}

export async function runIngestion() {
  for (const area of SEARCH_GRID) {
    const crawlRun = await prisma.crawlRun.create({ data: { sourceName: `grid:${area.city}` } });
    const errors: string[] = [];

    try {
      const raw = await fetchAllListings({ city: area.city, state: area.state, radiusMiles: area.radiusMiles });
      const deduped = dedupeListings(raw);
      const rents = deduped.map((l) => l.monthlyRentCents).sort((a, b) => a - b);
      const marketMedianRentCents = rents[Math.floor(rents.length / 2)] ?? 0;

      let newCount = 0;
      for (const listing of deduped) {
        const { row, isNewListing, rentDropped, previousRentCents } = await upsertListing(listing, marketMedianRentCents);
        if (isNewListing) newCount += 1;

        if (row.status === "ACTIVE" && (isNewListing || rentDropped)) {
          await notifyMatchingAlerts({
            listingId: row.id,
            city: row.city,
            zipCode: row.zipCode,
            monthlyRentCents: row.monthlyRent,
            triggerType: rentDropped ? "RENT_DROP" : "NEW_MATCH",
            title: row.title,
            listingUrl: row.listingUrl,
            previousRentCents,
          });
        }
      }

      await prisma.crawlRun.update({
        where: { id: crawlRun.id },
        data: { finishedAt: new Date(), listingsSeen: deduped.length, listingsNew: newCount },
      });
    } catch (err) {
      errors.push((err as Error).message);
      await prisma.crawlRun.update({ where: { id: crawlRun.id }, data: { finishedAt: new Date(), errors } });
      console.error(`[rentHunter] ingestion failed for ${area.city}:`, err);
    }
  }
}

if (require.main === module) {
  runIngestion()
    .then(() => prisma.$disconnect())
    .catch(async (err) => {
      console.error(err);
      await prisma.$disconnect();
      process.exit(1);
    });
}
