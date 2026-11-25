"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { monthLabel } from "@/lib/volume";
import { combineSirMonths, type SirEntryMonth, type SirMonthTotal } from "@/lib/sir";

// Bulk entry of first article inspections (SIRs): one row per month with
// SIRs completed, hours spent and nonconformances found. A month's total
// replaces the SIR figures from that month's daily entries (see sir.ts);
// the "Daily entries" column shows what's being replaced.

type Draft = { completed: string; hours: string; findings: string };
const EMPTY: Draft = { completed: "", hours: "", findings: "" };
const THIS_YEAR = new Date().getFullYear();
const THIS_MONTH = new Date().getMonth() + 1;
const n = (v: number) => v.toLocaleString("en-US");

function toDraft(m?: SirMonthTotal): Draft {
  return m
    ? { completed: String(m.completed), hours: m.hours === null ? "" : String(m.hours), findings: m.findings === null ? "" : String(m.findings) }
    : EMPTY;
}

const sameDraft = (a: Draft, b: Draft) => a.completed === b.completed && a.hours === b.hours && a.findings === b.findings;
const isBlank = (d: Draft) => !d.completed.trim() && !d.hours.trim() && !d.findings.trim();

// null = blank; NaN = not a valid number
function num(s: string, integer: boolean): number | null {
  const t = s.replace(/[,\s]/g, "");
  if (t === "") return null;
  const v = Number(t);
  return Number.isFinite(v) && v >= 0 && (!integer || Number.isInteger(v)) ? v : NaN;
}

export default function SirMonthsGrid({ year }: { year: number }) {
  const [saved, setSaved] = useState<Record<number, SirMonthTotal>>({});
  const [fromEntries, setFromEntries] = useState<Record<number, SirEntryMonth>>({});
  const [drafts, setDrafts] = useState<Record<number, Draft>>({});
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/sir-months?year=${year}`);
    if (!res.ok) return;
    const data: { months: SirMonthTotal[]; fromEntries: SirEntryMonth[] } = await res.json();
    const byMonth = Object.fromEntries(data.months.map((m) => [m.month, m]));
    setSaved(byMonth);
    setFromEntries(Object.fromEntries(data.fromEntries.map((m) => [m.month, m])));
    setDrafts(Object.fromEntries(Array.from({ length: 12 }, (_, i) => [i + 1, toDraft(byMonth[i + 1])])));
  }, [year]);

  useEffect(() => {
    setMessage(null);
    load();
  }, [load]);

  const maxMonth = year < THIS_YEAR ? 12 : year === THIS_YEAR ? THIS_MONTH : 0;
  const changed = Object.entries(drafts).filter(([m, d]) => !sameDraft(d, toDraft(saved[Number(m)])));
  // What reports will show for the year, by the same rule they use.
  const year_ = useMemo(() => combineSirMonths(Object.values(saved), Object.values(fromEntries)), [saved, fromEntries]);

  async function save() {
    setMessage(null);
    const toSave: SirMonthTotal[] = [];
    const toClear: number[] = [];
    for (const [mStr, d] of changed) {
      const month = Number(mStr);
      const label = monthLabel(year, month);
      if (isBlank(d)) {
        toClear.push(month);
        continue;
      }
      const completed = num(d.completed, true);
      const hours = num(d.hours, false);
      const findings = num(d.findings, true);
      if (completed === null) {
        setMessage({ kind: "error", text: `${label}: enter the SIRs completed (0 if none were finished that month).` });
        return;
      }
      if ([completed, hours, findings].some((v) => Number.isNaN(v))) {
        setMessage({ kind: "error", text: `${label}: use whole numbers for SIRs and nonconformances, and a number for hours.` });
        return;
      }
      toSave.push({ year, month, completed, hours, findings });
    }
    setSaving(true);
    try {
      if (toSave.length > 0) {
        const res = await fetch("/api/sir-months", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ months: toSave }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          setMessage({ kind: "error", text: data?.error ?? "Couldn't save." });
          return;
        }
      }
      for (const month of toClear) await fetch(`/api/sir-months?year=${year}&month=${month}`, { method: "DELETE" });
      const count = toSave.length + toClear.length;
      setMessage({ kind: "ok", text: `Saved ${count} month${count === 1 ? "" : "s"}.` });
      await load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <section id="sir" className="scroll-mt-20 space-y-3">
      <h2 className="pt-2 text-lg font-semibold">First Articles / SIRs</h2>

      <div className="grid grid-cols-3 gap-3">
        {[
          ["SIRs completed", n(year_.completed)],
          ["Hours invested", n(year_.hours)],
          ["Nonconformances found", n(year_.findings)],
        ].map(([label, value]) => (
          <div key={label} className="card p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
            <p className="mt-1 text-2xl font-bold">{value}</p>
            <p className="text-xs text-slate-400">{year} · what reports use</p>
          </div>
        ))}
      </div>

      {message && (
        <p
          role="status"
          className={`rounded-xl px-4 py-3 text-sm font-medium ${
            message.kind === "ok"
              ? "bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200"
              : "bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200"
          }`}
        >
          {message.text}
        </p>
      )}

      <div className="card">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold">SIRs by month &middot; {year}</h3>
          <button className="btn-primary" disabled={saving || changed.length === 0} onClick={save}>
            {saving ? "Saving…" : changed.length > 0 ? `Save ${changed.length} change${changed.length === 1 ? "" : "s"}` : "Saved"}
          </button>
        </div>
        <p className="mb-3 text-xs text-slate-400">
          A month you fill in replaces the SIR figures from that month&apos;s daily entries (those entries still appear
          in reports as examples). Hours and nonconformances are optional - left blank, they come from your daily
          entries. Clear a whole row to go back to your daily entries.
        </p>
        <div className="grid grid-cols-[3rem_1fr_1fr_1fr] items-center gap-x-2 gap-y-1.5 text-sm sm:grid-cols-[6rem_1fr_1fr_1fr_9rem]">
          <span className="text-xs uppercase text-slate-400">Month</span>
          <span className="text-xs uppercase text-slate-400">Completed</span>
          <span className="text-xs uppercase text-slate-400">Hours</span>
          <span className="text-xs uppercase text-slate-400">NCs found</span>
          <span className="hidden text-xs uppercase text-slate-400 sm:block">Daily entries</span>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
            const d = drafts[month] ?? EMPTY;
            const disabled = month > maxMonth;
            const e = fromEntries[month];
            const replaced = !isBlank(d);
            const set = (field: keyof Draft) => (ev: React.ChangeEvent<HTMLInputElement>) =>
              setDrafts((prev) => ({ ...prev, [month]: { ...(prev[month] ?? EMPTY), [field]: ev.target.value } }));
            return (
              <div key={month} className="contents">
                <span className={disabled ? "text-slate-300 dark:text-slate-600" : ""}>{monthLabel(year, month).slice(0, 3)}</span>
                {(
                  [
                    ["completed", "numeric", e?.completed],
                    ["hours", "decimal", e?.hours],
                    ["findings", "numeric", e?.findings],
                  ] as const
                ).map(([field, mode, entryValue]) => (
                  <input
                    key={field}
                    className="input px-2 py-1.5"
                    inputMode={mode}
                    disabled={disabled}
                    // Blank hours/NCs in a filled row fall back to the entries - show that.
                    placeholder={replaced && field !== "completed" && d[field].trim() === "" && entryValue ? `= ${n(entryValue)}` : ""}
                    value={d[field]}
                    onChange={set(field)}
                    aria-label={`${monthLabel(year, month)} SIR ${field}`}
                  />
                ))}
                <span className={`hidden text-xs sm:block ${replaced ? "text-slate-300 line-through dark:text-slate-600" : "text-slate-500"}`}>
                  {e ? `${e.completed} SIR${e.completed === 1 ? "" : "s"}${e.hours ? ` · ${n(e.hours)} h` : ""}${e.findings ? ` · ${e.findings} NC` : ""}` : ""}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
