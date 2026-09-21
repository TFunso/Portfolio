"use client";

import { useState } from "react";

export interface SavedSearchDTO {
  id: string;
  name: string;
  location: string;
  radiusMiles: number;
  maxRentCents: number | null;
  minBedrooms: number | null;
}

export interface AlertDTO {
  id: string;
  channel: "EMAIL" | "SMS" | "PUSH";
  triggerType: string;
  savedSearchName: string | null;
  createdAt: string;
}

export function AlertsManager({
  initialSavedSearches,
  initialAlerts,
}: {
  initialSavedSearches: SavedSearchDTO[];
  initialAlerts: AlertDTO[];
}) {
  const [savedSearches, setSavedSearches] = useState(initialSavedSearches);
  const [alerts, setAlerts] = useState(initialAlerts);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [radiusMiles, setRadiusMiles] = useState("25");
  const [maxRent, setMaxRent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function createSavedSearch(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/saved-searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          location,
          radiusMiles: Number(radiusMiles) || 25,
          maxRent: maxRent ? Number(maxRent) : undefined,
        }),
      });
      if (!res.ok) throw new Error("Could not save that search.");
      const { savedSearch } = await res.json();
      setSavedSearches((prev) => [
        {
          id: savedSearch.id,
          name: savedSearch.name,
          location: savedSearch.location,
          radiusMiles: savedSearch.radiusMiles,
          maxRentCents: savedSearch.maxRent,
          minBedrooms: savedSearch.minBedrooms,
        },
        ...prev,
      ]);
      setName("");
      setLocation("");
      setMaxRent("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function addAlert(savedSearchId: string, savedSearchName: string, triggerType: "NEW_MATCH" | "RENT_DROP") {
    setError(null);
    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ savedSearchId, channel: "EMAIL", triggerType }),
      });
      if (!res.ok) throw new Error("Could not create that alert.");
      const { alert } = await res.json();
      setAlerts((prev) => [
        { id: alert.id, channel: alert.channel, triggerType: alert.triggerType, savedSearchName, createdAt: alert.createdAt },
        ...prev,
      ]);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <form onSubmit={createSavedSearch} className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-6 sm:grid-cols-5">
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 sm:col-span-2">
          Search name
          <input
            required
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="Near downtown, under $1500"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Location
          <input
            required
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="City, ZIP, or address"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Radius (mi)
          <input
            type="number"
            min={1}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={radiusMiles}
            onChange={(e) => setRadiusMiles(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Max rent ($/mo)
          <input
            type="number"
            min={0}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={maxRent}
            onChange={(e) => setMaxRent(e.target.value)}
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="col-span-full rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50 sm:col-span-1"
        >
          Save search
        </button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Your saved searches</h2>
        {savedSearches.length === 0 && <p className="text-sm text-slate-500">No saved searches yet.</p>}
        <div className="flex flex-col gap-3">
          {savedSearches.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4">
              <div>
                <p className="font-medium text-slate-900">{s.name}</p>
                <p className="text-sm text-slate-500">
                  {s.location} · {s.radiusMiles} mi{s.maxRentCents ? ` · up to $${(s.maxRentCents / 100).toFixed(0)}/mo` : ""}
                </p>
              </div>
              <div className="flex gap-2 text-xs font-semibold">
                <button
                  onClick={() => addAlert(s.id, s.name, "NEW_MATCH")}
                  className="rounded-full border border-slate-300 px-3 py-1.5 hover:bg-slate-50"
                >
                  Email me new matches
                </button>
                <button
                  onClick={() => addAlert(s.id, s.name, "RENT_DROP")}
                  className="rounded-full border border-slate-300 px-3 py-1.5 hover:bg-slate-50"
                >
                  Email me rent drops
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Active alerts</h2>
        {alerts.length === 0 && <p className="text-sm text-slate-500">No alerts yet -- add one from a saved search above.</p>}
        <ul className="flex flex-col gap-2">
          {alerts.map((a) => (
            <li key={a.id} className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700">
              <span className="font-medium">{a.triggerType.replace(/_/g, " ").toLowerCase()}</span> via {a.channel.toLowerCase()}
              {a.savedSearchName ? ` for "${a.savedSearchName}"` : ""}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
