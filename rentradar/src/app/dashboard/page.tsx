import { runSearch } from "@/lib/search";
import { RankingTabs } from "@/components/RankingTabs";
import { FiltersPanel } from "@/components/FiltersPanel";
import { MapView } from "@/components/MapView";

interface DashboardSearchParams {
  city?: string;
  zipCode?: string;
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
  const result = await runSearch({
    city: searchParams.city,
    zipCode: searchParams.zipCode,
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
          {result.resultCount} rentals found{searchParams.city ? ` near ${searchParams.city}` : ""}
        </h1>
        <p className="text-sm text-slate-500">Ranked by total move-in cost (rent + deposit + fees).</p>
      </div>

      <MapView listings={result.cheapestOverall} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[240px_1fr]">
        <FiltersPanel />
        <RankingTabs cheapestOverall={result.cheapestOverall} cheapestByCategory={result.cheapestByCategory} />
      </div>
    </div>
  );
}
