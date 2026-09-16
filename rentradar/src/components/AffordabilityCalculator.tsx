"use client";

import { useState } from "react";
import type { AffordabilityResult } from "@/lib/affordability/calculator";

const BAND_COLOR: Record<AffordabilityResult["band"], string> = {
  comfortable: "text-brand-600",
  tight: "text-amber-600",
  stretched: "text-orange-600",
  unaffordable: "text-red-600",
};

export function AffordabilityCalculator() {
  const [annualIncome, setAnnualIncome] = useState("50000");
  const [monthlyRent, setMonthlyRent] = useState("1200");
  const [utilitiesIncluded, setUtilitiesIncluded] = useState(false);
  const [result, setResult] = useState<AffordabilityResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/affordability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          annualIncome: Number(annualIncome),
          monthlyRent: Number(monthlyRent),
          utilitiesIncluded,
        }),
      });
      setResult(await res.json());
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6">
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Annual income ($)
          <input
            type="number"
            min={0}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={annualIncome}
            onChange={(e) => setAnnualIncome(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Monthly rent ($)
          <input
            type="number"
            min={0}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={monthlyRent}
            onChange={(e) => setMonthlyRent(e.target.value)}
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={utilitiesIncluded} onChange={(e) => setUtilitiesIncluded(e.target.checked)} />
          Utilities included in rent
        </label>
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {loading ? "Calculating..." : "Calculate affordability"}
        </button>
      </form>

      {result && (
        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-6">
          <p className={`text-3xl font-bold ${BAND_COLOR[result.band]}`}>
            {result.affordabilityScore}/100 - {result.band}
          </p>
          <Row label="Recommended max rent (30% rule)" value={`$${(result.recommendedMaxRentCents / 100).toFixed(0)}/mo`} />
          <Row label="Rent-to-income ratio" value={`${(result.rentToIncomeRatio * 100).toFixed(0)}%`} />
          <Row label="Estimated utilities" value={`$${(result.estimatedMonthlyUtilitiesCents / 100).toFixed(0)}/mo`} />
          <Row label="Estimated transit" value={`$${(result.estimatedMonthlyTransitCents / 100).toFixed(0)}/mo`} />
          <Row label="Total monthly housing cost" value={`$${(result.totalMonthlyHousingCostCents / 100).toFixed(0)}/mo`} />
          <Row label="Total move-in cost" value={`$${(result.totalMoveInCostCents / 100).toFixed(0)}`} />
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-900">{value}</span>
    </div>
  );
}
