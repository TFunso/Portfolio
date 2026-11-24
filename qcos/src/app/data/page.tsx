"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Counts = Record<string, number>;

const LABELS: Record<string, string> = {
  dailyEntries: "Daily entries",
  evidenceRecords: "Evidence records",
  goalMetricEvents: "Goal events",
  classifications: "Classifications",
  didThisCountLogs: "“Did This Count?” checks",
  monthlyReflections: "Monthly reflections",
  weeklyDigests: "Weekly digests",
  promotionReports: "Promotion reports",
  gapChecks: "Gap checks",
  inspectionVolumes: "SAP volume months",
  goalYears: "Years with saved goals",
};

export default function DataPage() {
  const [counts, setCounts] = useState<Counts | null>(null);
  const [emailReady, setEmailReady] = useState(false);
  const [emailing, setEmailing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/backup?format=summary");
    if (res.ok) {
      const data = await res.json();
      setCounts(data.counts);
      setEmailReady(data.emailConfigured);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function emailBackup() {
    setEmailing(true);
    setMessage(null);
    try {
      const res = await fetch("/api/backup/email", { method: "POST" });
      const data = await res.json().catch(() => null);
      setMessage(
        res.ok
          ? { kind: "ok", text: "Backup emailed - check your inbox." }
          : { kind: "error", text: data?.error ?? "The backup email didn't send." },
      );
    } finally {
      setEmailing(false);
    }
  }

  async function restore(file: File) {
    if (
      !window.confirm(
        `Restore from "${file.name}"?\n\nThis only ADDS records that are missing. Nothing you have now is overwritten or deleted.`,
      )
    ) {
      return;
    }
    setRestoring(true);
    setMessage(null);
    try {
      const text = await file.text();
      const res = await fetch("/api/backup/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: text,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setMessage({
          kind: "error",
          text: data?.error ?? (res.status === 413 ? "That file is too large to upload in one go." : "Restore failed."),
        });
        return;
      }
      const added = Object.values(data.added as Counts).reduce((a, b) => a + b, 0);
      const skipped = Object.values(data.skipped as Counts).reduce((a, b) => a + b, 0);
      setMessage({
        kind: "ok",
        text:
          added === 0
            ? `Nothing to add - all ${skipped} records in that backup are already here.`
            : `Restored ${added} missing record${added === 1 ? "" : "s"} (${skipped} already here, left as-is).`,
      });
      load();
    } finally {
      setRestoring(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Data &amp; Backup</h1>
        <p className="mt-1 text-slate-500 dark:text-slate-400">
          Everything you&apos;ve logged lives in one database. Keep your own copy so years of evidence can&apos;t be lost.
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

      <section className="card space-y-3">
        <h2 className="font-semibold">Download a backup</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          The full backup is one file with everything in it - the only format you can restore from. The spreadsheet is
          your Evidence Vault for reading in Excel.
        </p>
        <div className="flex flex-wrap gap-2">
          <a className="btn-primary" href="/api/backup" download>
            Download full backup (.json)
          </a>
          <a className="btn-secondary" href="/api/backup?format=csv" download>
            Evidence as spreadsheet (.csv)
          </a>
        </div>
        <p className="text-xs text-slate-400">
          Save it somewhere that isn&apos;t this app - OneDrive, Google Drive, or email it to yourself. Avoid a work-managed
          drive you could lose access to.
        </p>
      </section>

      <section className="card space-y-3">
        <h2 className="font-semibold">Automatic monthly backup</h2>
        {emailReady ? (
          <>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              On. A full backup is emailed to you on the first Monday of every month, alongside the weekly check-in.
            </p>
            <button className="btn-secondary" disabled={emailing} onClick={emailBackup}>
              {emailing ? "Sending…" : "Email me a backup now"}
            </button>
          </>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Off. Add <code>RESEND_API_KEY</code> and <code>NOTIFY_EMAIL</code> in Vercel (the same two settings as the
            weekly check-in email) and a backup will be emailed to you on the first Monday of every month. Until then,
            download one above every month or so.
          </p>
        )}
      </section>

      <section className="card space-y-3">
        <h2 className="font-semibold">Restore from a backup</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Upload a <code>.json</code> backup. Records that are missing get added back; anything already here is left
          exactly as it is, and nothing is deleted - so it&apos;s safe to run more than once.
        </p>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) restore(file);
          }}
        />
        <button className="btn-secondary" disabled={restoring} onClick={() => fileInput.current?.click()}>
          {restoring ? "Restoring…" : "Choose backup file…"}
        </button>
      </section>

      <section className="card">
        <h2 className="mb-2 font-semibold">What&apos;s stored right now</h2>
        {counts ? (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-3">
            {Object.entries(LABELS).map(([key, label]) => (
              <div key={key} className="flex items-baseline justify-between gap-2">
                <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
                <dd className="font-semibold">{counts[key] ?? 0}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-sm text-slate-400">Loading…</p>
        )}
      </section>
    </div>
  );
}
