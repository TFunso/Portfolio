import { PrismaClient } from "@prisma/client";
import { mockListings } from "../src/lib/sources/adapters/mockAdapter";
import { totalMoveInCostCents } from "../src/types/listing";
import { scoreQuality } from "../src/lib/aggregation/qualityScore";
import { scoreScamRisk } from "../src/lib/aggregation/scam";

const prisma = new PrismaClient();

async function main() {
  const source = await prisma.source.upsert({
    where: { name: "rentradar-mock" },
    update: {},
    create: {
      name: "rentradar-mock",
      type: "MANUAL",
      baseUrl: "https://example.invalid",
      robotsAllowed: true,
      isEnabled: true,
    },
  });

  const listings = await mockListings();

  for (const l of listings) {
    const scam = scoreScamRisk(l);
    const quality = scoreQuality(l);
    await prisma.listing.upsert({
      where: { sourceId_externalId: { sourceId: source.id, externalId: l.externalId } },
      update: {},
      create: {
        externalId: l.externalId,
        sourceId: source.id,
        sourceType: l.sourceType,
        title: l.title,
        description: l.description,
        addressLine1: l.addressLine1,
        city: l.city,
        state: l.state,
        zipCode: l.zipCode,
        latitude: l.latitude,
        longitude: l.longitude,
        monthlyRent: l.monthlyRentCents,
        securityDeposit: l.securityDepositCents,
        applicationFee: l.applicationFeeCents,
        otherMoveInFees: l.otherMoveInFeesCents,
        utilitiesIncluded: l.utilitiesIncluded ?? false,
        bedrooms: l.bedrooms,
        bathrooms: l.bathrooms,
        squareFeet: l.squareFeet,
        category: l.category,
        petFriendly: l.petFriendly,
        parkingAvailable: l.parkingAvailable,
        furnished: l.furnished,
        shortTermLease: l.shortTermLease,
        noCreditCheck: l.noCreditCheck,
        lowDeposit: l.lowDeposit,
        availableFrom: l.availableFrom ? new Date(l.availableFrom) : null,
        listingUrl: l.listingUrl,
        contactName: l.contactName,
        contactPhone: l.contactPhone,
        contactEmail: l.contactEmail,
        contactFormUrl: l.contactFormUrl,
        officeHours: l.officeHours,
        totalMoveInCost: totalMoveInCostCents(l),
        qualityScore: quality,
        scamRiskScore: scam.score,
        scamFlags: scam.flags,
      },
    });
  }

  console.log(`Seeded ${listings.length} mock listings from ${source.name}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
