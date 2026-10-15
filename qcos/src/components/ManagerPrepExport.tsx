"use client";

import { useState } from "react";
import { MONTH_NAMES } from "@/lib/dates";

export default function ManagerPrepExport() {
  const now = new Date();
  const [periodType, setPeriodType] = useState<"month" | "quarter">("month");
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year] = useState(now.getFullYear());

  const params = new URLSearchParams({ period: periodType, year: String(year) });
  if (periodType === "month") params.set("month", String(month));
  const href = `/api/manager-prep/export?${params.toString()}`;

  return (
    <section className="card">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Manager 1:1 Prep
      </h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        A Word doc of this period&apos;s highlights, cross-functional support, and goal progress - ready to send or print
        for a 1:1.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select
          className="input w-auto text-sm"
          value={periodType}
          onChange={(e) => setPeriodType(e.target.value as "month" | "quarter")}
        >
          <option value="month">By month</option>
          <option value="quarter">By quarter</option>
        </select>
        {periodType === "month" && (
          <select className="input w-auto text-sm" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {MONTH_NAMES.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
        )}
        <a className="btn-primary text-sm" href={href} download>
          Download
        </a>
      </div>
    </section>
  );
}
