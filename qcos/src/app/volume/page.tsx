"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  monthLabel,
  parsePastedVolume,
  totalVolume,
  completeMonth,
  type MonthVolume,
  type PartialMonth,
  type PasteResult,
  type SlashDateOrder,
  type TwoColumnLayout,
} from "@/lib/volume";
import SirMonthsGrid from "@/components/SirMonthsGrid";

type Draft = { inspected: string; accepted: string; rejected: string };
const EMPTY: Draft = { inspected: "", accepted: "", rejected: "" };
const THIS_YEAR = new Date().getFullYear();
const THIS_MONTH = new Date().getMonth() + 1;
const YEARS = [THIS_YEAR, THIS_YEAR - 1, THIS_YEAR - 2];
const n = (v: number) => v.toLocaleString("en-US");

function toDraft(m?: MonthVolume): Draft {
  return m ? { inspected: String(m.inspected), accepted: String(m.accepted), rejected: String(m.rejected) } : EMPTY;
}

// Blank fields become null so completeMonth() can work them out.
function toPartial(d: Draft): PartialMonth {
  const num = (s: string) => (s.trim() === "" ? null : Number(s.replace(/[,\s]/g, "")));
  return { inspected: num(d.inspected), accepted: num(d.accepted), rejected: num(d.rejected) };
}

function sameDraft(a: Draft, b: Draft) {
  return a.inspected === b.inspected && a.accepted === b.accepted && a.rejected === b.rejected;
}

export default function VolumePage() {
  const [year, setYear] = useState(THIS_YEAR);
  const [saved, setSaved] = useState<Record<number, MonthVolume>>({});
  const [drafts, setDrafts] = useState<Record<number, Draft>>({});
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [dateOrder, setDateOrder] = useState<SlashDateOrder>("mdy");
  const [twoColumns, setTwoColumns] = useState<TwoColumnLayout>("inspected-accepted");
  const [preview, setPreview] = useState<PasteResult | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/volume?year=${year}`);
    if (!res.ok) return;
    const months: MonthVolume[] = (await res.json()).months;
    const byMonth = Object.fromEntries(months.map((m) => [m.month, m]));
    setSaved(byMonth);
    setDrafts(Object.fromEntries(Array.from({ length: 12 }, (_, i) => [i + 1, toDraft(byMonth[i + 1])])));
  }, [year]);

  useEffect(() => {
    load();
  }, [load]);

  const maxMonth = year < THIS_YEAR ? 12 : year === THIS_YEAR ? THIS_MONTH : 0;
  const totals = useMemo(() => totalVolume(Object.values(saved)), [saved]);
  const changed = Object.entries(drafts).filter(([m, d]) => !sameDraft(d, toDraft(saved[Number(m)])));

  async function put(months: MonthVolume[]): Promise<boolean> {
    const res = await fetch("/api/volume", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ months }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setMessage({ kind: "error", text: data?.error ?? "Couldn't save." });
      return false;
    }
    return true;
  }

  async function saveGrid() {
    setMessage(null);
    const toSave: MonthVolume[] = [];
    const toClear: number[] = [];
    for (const [mStr, d] of changed) {
      const month = Number(mStr);
      if (!d.inspected.trim() && !d.accepted.trim() && !d.rejected.trim()) {
        toClear.push(month);
        continue;
      }
      const full = completeMonth(toPartial(d));
      if (typeof full === "string") {
        setMessage({ kind: "error", text: `${monthLabel(year, month)}: ${full}` });
        return;
      }
      toSave.push({ year, month, ...full });
    }
    setSaving(true);
    try {
      if (toSave.length > 0 && !(await put(toSave))) return;
      for (const month of toClear) await fetch(`/api/volume?year=${year}&month=${month}`, { method: "DELETE" });
      setMessage({ kind: "ok", text: `Saved ${toSave.length + toClear.length} month${toSave.length + toClear.length === 1 ? "" : "s"}.` });
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function savePaste() {
    if (!preview || preview.months.length === 0) return;
    setSaving(true);
    setMessage(null);
    try {
      if (await put(preview.months)) {
        setMessage({ kind: "ok", text: `Saved ${preview.months.length} months from ${preview.rowsUsed} pasted rows.` });
        setPreview(null);
        setPasteText("");
        setPasteOpen(false);
        const years = Array.from(new Set(preview.months.map((m) => m.year)));
        if (!years.includes(year)) setYear(years[years.length - 1]);
        else await load();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Monthly Totals</h1>
        <p className="mt-1 text-slate-500 dark:text-slate-400">
          Figures you enter by the month instead of one entry at a time: your SAP inspection volume and your first
          article inspections (SIRs). Reports use these for each review period, and a month&apos;s total replaces the
          same figures from that month&apos;s daily entries, so nothing is counted twice.
        </p>
        <p className="mt-2 text-sm">
          <a href="#sir" className="underline">
            Jump to First Articles / SIRs
          </a>
        </p>
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

      <div className="flex flex-wrap items-center gap-2">
        <select className="input w-auto" value={year} onChange={(e) => setYear(Number(e.target.value))} aria-label="Year">
          {YEARS.map((y) => (
            <option key={y}>{y}</option>
          ))}
        </select>
        <button className="btn-secondary" onClick={() => setPasteOpen((v) => !v)}>
          {pasteOpen ? "Close paste" : "Paste from Excel / SAP export"}
        </button>
      </div>

      {pasteOpen && (
        <section className="card space-y-3">
          <h2 className="font-semibold">Paste rows from your SAP export</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Copy columns from Excel and paste below - one row per day or per month: the <strong>date</strong>, then any{" "}
            <strong>two</strong> of inspected / accepted / rejected (the third is worked out), or all three in that order.
            Header and total rows are skipped. Daily rows are added up into monthly totals <em>on this device</em> - only
            the monthly totals are saved, never the rows.
          </p>
          <textarea
            className="input min-h-[160px] font-mono text-xs"
            placeholder={"Date\tInspected\tAccepted\n01/05/2026\t43\t42\n01/06/2026\t38\t38"}
            value={pasteText}
            onChange={(e) => {
              setPasteText(e.target.value);
              setPreview(null);
            }}
          />
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm">
              Dates like 03/04/2026 are{" "}
              <select
                className="input inline-block w-auto py-1"
                value={dateOrder}
                onChange={(e) => {
                  setDateOrder(e.target.value as SlashDateOrder);
                  setPreview(null);
                }}
              >
                <option value="mdy">month/day (US)</option>
                <option value="dmy">day/month</option>
              </select>
            </label>
            <label className="text-sm">
              Two numbers after the date are{" "}
              <select
                className="input inline-block w-auto py-1"
                value={twoColumns}
                onChange={(e) => {
                  setTwoColumns(e.target.value as TwoColumnLayout);
                  setPreview(null);
                }}
              >
                <option value="inspected-accepted">inspected, accepted</option>
                <option value="accepted-rejected">accepted, rejected</option>
                <option value="inspected-rejected">inspected, rejected</option>
              </select>
            </label>
            <button
              className="btn-secondary"
              disabled={!pasteText.trim()}
              onClick={() => setPreview(parsePastedVolume(pasteText, dateOrder, twoColumns))}
            >
              Preview totals
            </button>
          </div>

          {preview && (
            <div className="space-y-2">
              {preview.months.length === 0 ? (
                <p className="text-sm text-red-600 dark:text-red-400">
                  No usable rows found. Each row needs a date followed by accepted and rejected counts.
                </p>
              ) : (
                <>
                  <p className="text-sm">
                    {preview.rowsUsed} rows &rarr; {preview.months.length} monthly totals. Saving replaces any totals
                    already entered for these months.
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-left text-xs uppercase text-slate-400">
                        <tr>
                          <th className="py-1 pr-3">Month</th>
                          <th className="py-1 pr-3 text-right">Inspected</th>
                          <th className="py-1 pr-3 text-right">Accepted</th>
                          <th className="py-1 pr-3 text-right">Rejected</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.months.map((m) => (
                          <tr key={`${m.year}-${m.month}`} className="border-t border-slate-100 dark:border-slate-800">
                            <td className="py-1 pr-3">{monthLabel(m.year, m.month)}</td>
                            <td className="py-1 pr-3 text-right">{n(m.inspected)}</td>
                            <td className="py-1 pr-3 text-right">{n(m.accepted)}</td>
                            <td className="py-1 pr-3 text-right">{n(m.rejected)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
              {preview.skipped.length > 0 && (
                <details className="text-xs text-slate-500 dark:text-slate-400">
                  <summary>{preview.skipped.length} rows skipped</summary>
                  <ul className="mt-1 space-y-0.5">
                    {preview.skipped.slice(0, 20).map((s) => (
                      <li key={s.line}>
                        Row {s.line}: {s.reason} - <span className="font-mono">{s.text}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
              {preview.months.length > 0 && (
                <button className="btn-primary" disabled={saving} onClick={savePaste}>
                  {saving ? "Saving…" : `Save ${preview.months.length} months`}
                </button>
              )}
            </div>
          )}
        </section>
      )}

      <h2 className="pt-2 text-lg font-semibold">Inspection volume (SAP)</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Lots inspected", n(totals.inspected), `${year} · ${totals.months} month${totals.months === 1 ? "" : "s"} entered`],
          ["Accept rate", totals.acceptRate === null ? "-" : `${totals.acceptRate}%`, `${n(totals.accepted)} lots accepted`],
          ["QNs raised", n(totals.qnsRaised), "one per rejected lot"],
          ["Reject rate", totals.rejectRate === null ? "-" : `${totals.rejectRate}%`, `${n(totals.rejected)} lots rejected`],
        ].map(([label, value, hint]) => (
          <div key={label} className="card p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
            <p className="mt-1 text-2xl font-bold">{value}</p>
            <p className="text-xs text-slate-400">{hint}</p>
          </div>
        ))}
      </div>

      <section className="card">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">SAP lots by month &middot; {year}</h2>
          <button className="btn-primary" disabled={saving || changed.length === 0} onClick={saveGrid}>
            {saving ? "Saving…" : changed.length > 0 ? `Save ${changed.length} change${changed.length === 1 ? "" : "s"}` : "Saved"}
          </button>
        </div>
        <p className="mb-3 text-xs text-slate-400">
          Fill in any two - the third is worked out (shown in grey). Each rejected lot counts as one QN raised. To
          recalculate a number, clear it. Clear all three to remove a month.
        </p>
        <div className="grid grid-cols-[3rem_1fr_1fr_1fr] items-center gap-x-2 gap-y-1.5 text-sm sm:grid-cols-[6rem_1fr_1fr_1fr_5rem]">
          <span className="text-xs uppercase text-slate-400">Month</span>
          <span className="text-xs uppercase text-slate-400">Inspected</span>
          <span className="text-xs uppercase text-slate-400">Accepted</span>
          <span className="text-xs uppercase text-slate-400">Rejected / QNs</span>
          <span className="hidden text-right text-xs uppercase text-slate-400 sm:block">Accept %</span>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
            const d = drafts[month] ?? EMPTY;
            const disabled = month > maxMonth;
            // Live preview of the worked-out number while typing.
            const filled = completeMonth(toPartial(d));
            const preview = typeof filled === "string" ? null : filled;
            const decided = preview ? preview.accepted + preview.rejected : 0;
            const rate = preview && decided > 0 ? `${Math.round((preview.accepted / decided) * 1000) / 10}%` : "";
            const set = (field: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement>) =>
              setDrafts((prev) => ({ ...prev, [month]: { ...(prev[month] ?? EMPTY), [field]: e.target.value } }));
            return (
              <div key={month} className="contents">
                <span className={disabled ? "text-slate-300 dark:text-slate-600" : ""}>{monthLabel(year, month).slice(0, 3)}</span>
                {(["inspected", "accepted", "rejected"] as const).map((field) => (
                  <input
                    key={field}
                    className="input px-2 py-1.5"
                    inputMode="numeric"
                    disabled={disabled}
                    placeholder={!disabled && preview && d[field].trim() === "" ? `= ${n(preview[field])}` : ""}
                    value={d[field]}
                    onChange={set(field)}
                    aria-label={`${monthLabel(year, month)} ${field}`}
                  />
                ))}
                <span className="hidden text-right text-xs text-slate-500 sm:block">{rate}</span>
              </div>
            );
          })}
        </div>
      </section>

      <SirMonthsGrid year={year} />
    </div>
  );
}
