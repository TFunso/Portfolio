"use client";

import { useState } from "react";
import type { RentalCategory, ScoredListing } from "@/types/listing";
import { CATEGORY_LABELS } from "@/types/listing";
import { ListingCard } from "@/components/ListingCard";

export interface RankingTabsProps {
  cheapestOverall: ScoredListing[];
  cheapestByCategory: Record<RentalCategory, ScoredListing[]>;
}

const TAB_ORDER: Array<{ key: "OVERALL" | RentalCategory; label: string }> = [
  { key: "OVERALL", label: "Cheapest Overall" },
  { key: "STUDIO", label: "Cheapest Studio" },
  { key: "ONE_BEDROOM", label: "Cheapest 1BR" },
  { key: "TWO_BEDROOM", label: "Cheapest 2BR" },
  { key: "ROOMMATE", label: "Cheapest Roommates" },
  { key: "PRIVATE_ROOM", label: "Cheapest Private Room" },
  { key: "HOUSE_SHARE", label: "Cheapest House Share" },
];

export function RankingTabs({ cheapestOverall, cheapestByCategory }: RankingTabsProps) {
  const [active, setActive] = useState<(typeof TAB_ORDER)[number]["key"]>("OVERALL");

  const listings = active === "OVERALL" ? cheapestOverall : cheapestByCategory[active];

  return (
    <div>
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        {TAB_ORDER.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActive(tab.key)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              active === tab.key ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-4">
        {listings.length === 0 && (
          <p className="text-sm text-slate-500">
            No {active === "OVERALL" ? "" : CATEGORY_LABELS[active as RentalCategory].toLowerCase()} listings match
            your filters yet.
          </p>
        )}
        {listings.map((listing, i) => (
          <ListingCard key={listing.id} listing={listing} rank={i + 1} />
        ))}
      </div>
    </div>
  );
}
