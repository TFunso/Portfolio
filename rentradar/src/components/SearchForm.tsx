"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SearchForm() {
  const router = useRouter();
  const [location, setLocation] = useState("");
  const [maxBudget, setMaxBudget] = useState("");
  const [moveInDate, setMoveInDate] = useState("");
  const [bedrooms, setBedrooms] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (location) params.set("city", location);
    if (maxBudget) params.set("maxRent", maxBudget);
    if (moveInDate) params.set("moveInDate", moveInDate);
    if (bedrooms) params.set("bedrooms", bedrooms);
    router.push(`/dashboard?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 rounded-xl bg-white p-6 shadow-sm sm:grid-cols-4">
      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
        Location
        <input
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder="City or ZIP"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
        Max budget ($/mo)
        <input
          type="number"
          min={0}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder="1500"
          value={maxBudget}
          onChange={(e) => setMaxBudget(e.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
        Move-in date
        <input
          type="date"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          value={moveInDate}
          onChange={(e) => setMoveInDate(e.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
        Bedrooms
        <select
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          value={bedrooms}
          onChange={(e) => setBedrooms(e.target.value)}
        >
          <option value="">Any</option>
          <option value="0">Studio</option>
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3+</option>
        </select>
      </label>
      <button
        type="submit"
        className="col-span-full rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 sm:col-span-1"
      >
        Find cheapest rentals
      </button>
    </form>
  );
}
