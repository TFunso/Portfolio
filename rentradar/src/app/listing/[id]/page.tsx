import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { dbListingToScored } from "@/lib/aggregation/fromDb";
import { ListingCard } from "@/components/ListingCard";
import { MapView } from "@/components/MapView";

export default async function ListingDetailPage({ params }: { params: { id: string } }) {
  const row = await prisma.listing.findUnique({
    where: { id: params.id },
    include: { priceHistory: { orderBy: { recordedAt: "asc" } }, source: true },
  });
  if (!row) notFound();

  const listing = dbListingToScored(row);

  return (
    <div className="flex flex-col gap-6">
      <ListingCard listing={listing} />

      {listing.latitude != null && listing.longitude != null && (
        <MapView listings={[listing]} centerLat={listing.latitude} centerLng={listing.longitude} radiusMiles={1} />
      )}

      {row.priceHistory.length > 1 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-2 text-sm font-semibold text-slate-900">Price history</h3>
          <ul className="text-sm text-slate-600">
            {row.priceHistory.map((p) => (
              <li key={p.id}>
                {new Date(p.recordedAt).toLocaleDateString()}: ${(p.monthlyRent / 100).toFixed(0)}/mo
              </li>
            ))}
          </ul>
        </div>
      )}

      {listing.scamFlags.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          <h3 className="font-semibold">Anti-scam flags</h3>
          <ul className="mt-1 list-inside list-disc">
            {listing.scamFlags.map((flag) => (
              <li key={flag}>{flag}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
