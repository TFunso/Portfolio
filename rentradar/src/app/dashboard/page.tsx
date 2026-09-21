import { runSearch } from "@/lib/search";
import { RankingTabs } from "@/components/RankingTabs";
import { FiltersPanel } from "@/components/FiltersPanel";
import { RadiusSearchMap } from "@/components/RadiusSearchMap";

interface DashboardSearchParams {
  location?: string;
  radiusMiles?: string;
  maxRent?: string;
  bedrooms?: string;
  petFriendly?: string;
  parkingAvailable?: string;
  furnished?: string;
  shortTermLease?: string;
  noCreditCheck?: string;
  lowDeposit?: string;
  utilitiesIncluded?: string;
}

export default async function DashboardPage({ searchParams }: { searchParams: DashboardSearchParams }) {
  const radiusMiles = searchParams.radiusMiles ? Number(searchParams.radiusMiles) : undefined;

  const result = await runSearch({
    location: searchParams.location,
    radiusMiles,
    maxRentCents: searchParams.maxRent ? Math.round(Number(searchParams.maxRent) * 100) : undefined,
    bedrooms: searchParams.bedrooms ? Number(searchParams.bedrooms) : undefined,
    petFriendly: searchParams.petFriendly === "true",
    parkingAvailable: searchParams.parkingAvailable === "true",
    furnished: searchParams.furnished === "true",
    shortTermLease: searchParams.shortTermLease === "true",
    noCreditCheck: searchParams.noCreditCheck === "true",
    lowDeposit: searchParams.lowDeposit === "true",
    utilitiesIncluded: searchParams.utilitiesIncluded === "true",
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          {result.resultCount} rentals found
          {searchParams.location ? ` within ${radiusMiles ?? 25} mi of ${searchParams.location}` : ""}
        </h1>
        <p className="text-sm text-slate-500">Ranked by total move-in cost (rent + deposit + fees).</p>
        {searchParams.location && !result.center && (
          <p className="text-sm text-amber-600">
            Couldn&apos;t pinpoint &quot;{searchParams.location}&quot; -- showing all listings instead.
          </p>
        )}
      </div>

      <RadiusSearchMap
        listings={result.cheapestOverall}
        centerLat={result.center?.lat}
        centerLng={result.center?.lng}
        radiusMiles={radiusMiles ?? 25}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[240px_1fr]">
        <FiltersPanel />
        <RankingTabs cheapestOverall={result.cheapestOverall} cheapestByCategory={result.cheapestByCategory} />
      </div>
    </div>
  );
}
