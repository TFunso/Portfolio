"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

const FILTERS: Array<{ key: string; label: string }> = [
  { key: "petFriendly", label: "Pet friendly" },
  { key: "parkingAvailable", label: "Parking" },
  { key: "furnished", label: "Furnished" },
  { key: "shortTermLease", label: "Short-term lease" },
  { key: "noCreditCheck", label: "No credit check" },
  { key: "lowDeposit", label: "Low deposit" },
  { key: "utilitiesIncluded", label: "Utilities included" },
];

export function FiltersPanel() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function toggle(key: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (params.get(key) === "true") {
      params.delete(key);
    } else {
      params.set(key, "true");
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-900">Filters</h3>
      <div className="flex flex-col gap-2">
        {FILTERS.map((f) => (
          <label key={f.key} className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={searchParams.get(f.key) === "true"}
              onChange={() => toggle(f.key)}
            />
            {f.label}
          </label>
        ))}
      </div>
    </div>
  );
}
