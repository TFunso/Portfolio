import Link from "next/link";
import type { ScoredListing } from "@/types/listing";
import { CATEGORY_LABELS } from "@/types/listing";
import { ContactActions } from "@/components/ContactActions";

function dollars(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export function ListingCard({ listing, rank }: { listing: ScoredListing; rank?: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          {rank != null && <span className="text-xs font-semibold text-brand-600">#{rank} cheapest</span>}
          <h3 className="text-lg font-semibold text-slate-900">
            <Link href={`/listing/${listing.id}`}>{listing.title}</Link>
          </h3>
          <p className="text-sm text-slate-500">
            {listing.addressLine1 ? `${listing.addressLine1}, ` : ""}
            {listing.city}, {listing.state} {listing.zipCode}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-slate-900">{dollars(listing.monthlyRentCents)}/mo</p>
          <p className="text-xs text-slate-500">Move-in total: {dollars(listing.totalMoveInCostCents)}</p>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-2 text-sm text-slate-600 sm:grid-cols-4">
        <Field label="Type" value={CATEGORY_LABELS[listing.category]} />
        <Field label="Bed / Bath" value={`${listing.bedrooms} / ${listing.bathrooms ?? "-"}`} />
        <Field label="Sq ft" value={listing.squareFeet ? String(listing.squareFeet) : "-"} />
        <Field label="Deposit" value={listing.securityDepositCents != null ? dollars(listing.securityDepositCents) : "-"} />
        <Field label="Available" value={listing.availableFrom ? new Date(listing.availableFrom).toLocaleDateString() : "Now"} />
        <Field label="Source" value={listing.sourceName} />
        <Field label="Quality score" value={`${Math.round(listing.qualityScore)}/100`} />
        <Field
          label="Scam risk"
          value={`${Math.round(listing.scamRiskScore)}/100`}
          warn={listing.scamRiskScore >= 30}
        />
      </dl>

      {listing.contactName && <p className="mt-3 text-sm text-slate-600">Property manager: {listing.contactName}</p>}
      {listing.officeHours && <p className="text-xs text-slate-400">Office hours: {listing.officeHours}</p>}

      <div className="mt-4">
        <ContactActions listing={listing} />
      </div>
    </div>
  );
}

function Field({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className={warn ? "font-semibold text-amber-600" : "text-slate-800"}>{value}</dd>
    </div>
  );
}
