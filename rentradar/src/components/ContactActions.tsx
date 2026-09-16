"use client";

import type { ScoredListing } from "@/types/listing";

export function ContactActions({ listing }: { listing: ScoredListing }) {
  return (
    <div className="flex flex-wrap gap-2 text-xs font-semibold">
      {listing.contactPhone && (
        <a
          href={`tel:${listing.contactPhone}`}
          className="rounded-full bg-brand-600 px-3 py-1.5 text-white hover:bg-brand-700"
        >
          Call Now
        </a>
      )}
      {listing.contactEmail && (
        <a
          href={`mailto:${listing.contactEmail}`}
          className="rounded-full border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50"
        >
          Send Email
        </a>
      )}
      <a
        href={listing.listingUrl}
        target="_blank"
        rel="noreferrer"
        className="rounded-full border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50"
      >
        Visit Listing
      </a>
      <button
        type="button"
        onClick={() => alert("Saved (wire this up to /api/saved-listings once auth is connected).")}
        className="rounded-full border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50"
      >
        Save Property
      </button>
      <button
        type="button"
        onClick={() => alert("Added to comparison tray.")}
        className="rounded-full border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50"
      >
        Compare
      </button>
    </div>
  );
}
