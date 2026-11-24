import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Backups. Everything QCOS knows lives in one Postgres database, so this is
// the user's own copy of it:
//   - buildBackup(): every table as one JSON document (the restorable format)
//   - evidenceCsv(): the Evidence Vault as a spreadsheet (Excel-friendly,
//     not restorable - for reading, filtering, pasting into a review)
//   - restoreBackup(): merge a JSON backup back in. Merge-only by design:
//     rows whose id (or unique key) already exists are left untouched and
//     nothing is ever deleted, so restoring an old backup can't overwrite
//     newer work and restoring twice is harmless.
// ---------------------------------------------------------------------------

export const BACKUP_VERSION = 1;

// Restore order respects foreign keys: entries before the rows that point
// at them.
const TABLES = [
  { key: "dailyEntries", fields: Prisma.DailyEntryScalarFieldEnum },
  { key: "classifications", fields: Prisma.ClassificationScalarFieldEnum },
  { key: "evidenceRecords", fields: Prisma.EvidenceRecordScalarFieldEnum },
  { key: "goalMetricEvents", fields: Prisma.GoalMetricEventScalarFieldEnum },
  { key: "didThisCountLogs", fields: Prisma.DidThisCountLogScalarFieldEnum },
  { key: "monthlyReflections", fields: Prisma.MonthlyReflectionScalarFieldEnum },
  { key: "weeklyDigests", fields: Prisma.WeeklyDigestScalarFieldEnum },
  { key: "promotionReports", fields: Prisma.PromotionReportScalarFieldEnum },
  { key: "gapChecks", fields: Prisma.GapCheckScalarFieldEnum },
  { key: "inspectionVolumes", fields: Prisma.InspectionVolumeScalarFieldEnum },
  { key: "goalYears", fields: Prisma.GoalYearScalarFieldEnum },
] as const;

type TableKey = (typeof TABLES)[number]["key"];
type Row = Record<string, unknown>;

export interface QcosBackup {
  app: "qcos";
  version: number;
  exportedAt: string;
  counts: Record<TableKey, number>;
  data: Record<TableKey, Row[]>;
}

export async function buildBackup(): Promise<QcosBackup> {
  const [
    dailyEntries,
    classifications,
    evidenceRecords,
    goalMetricEvents,
    didThisCountLogs,
    monthlyReflections,
    weeklyDigests,
    promotionReports,
    gapChecks,
    inspectionVolumes,
    goalYears,
  ] = await Promise.all([
    prisma.dailyEntry.findMany({ orderBy: { entryDate: "asc" } }),
    prisma.classification.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.evidenceRecord.findMany({ orderBy: { recordDate: "asc" } }),
    prisma.goalMetricEvent.findMany({ orderBy: { eventDate: "asc" } }),
    prisma.didThisCountLog.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.monthlyReflection.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.weeklyDigest.findMany({ orderBy: { weekStart: "asc" } }),
    prisma.promotionReport.findMany({ orderBy: { generatedAt: "asc" } }),
    prisma.gapCheck.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.inspectionVolume.findMany({ orderBy: [{ year: "asc" }, { month: "asc" }] }),
    prisma.goalYear.findMany({ orderBy: { year: "asc" } }),
  ]);

  const data = {
    dailyEntries,
    classifications,
    evidenceRecords,
    goalMetricEvents,
    didThisCountLogs,
    monthlyReflections,
    weeklyDigests,
    promotionReports,
    gapChecks,
    inspectionVolumes,
    goalYears,
  } as Record<TableKey, Row[]>;

  return {
    app: "qcos",
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    counts: countRows(data),
    data,
  };
}

function countRows(data: Record<TableKey, Row[]>): Record<TableKey, number> {
  return Object.fromEntries(TABLES.map(({ key }) => [key, data[key]?.length ?? 0])) as Record<TableKey, number>;
}

export async function backupCounts(): Promise<Record<TableKey, number>> {
  const [a, b, c, d, e, f, g, h, i, j, k] = await Promise.all([
    prisma.dailyEntry.count(),
    prisma.classification.count(),
    prisma.evidenceRecord.count(),
    prisma.goalMetricEvent.count(),
    prisma.didThisCountLog.count(),
    prisma.monthlyReflection.count(),
    prisma.weeklyDigest.count(),
    prisma.promotionReport.count(),
    prisma.gapCheck.count(),
    prisma.inspectionVolume.count(),
    prisma.goalYear.count(),
  ]);
  return {
    dailyEntries: a,
    classifications: b,
    evidenceRecords: c,
    goalMetricEvents: d,
    didThisCountLogs: e,
    monthlyReflections: f,
    weeklyDigests: g,
    promotionReports: h,
    gapChecks: i,
    inspectionVolumes: j,
    goalYears: k,
  };
}

export function backupFilename(date = new Date(), ext = "json"): string {
  return `QCOS-backup-${date.toISOString().slice(0, 10)}.${ext}`;
}

// ------------------------------------------------------------------ CSV

function csvCell(value: unknown): string {
  const text = value instanceof Date ? value.toISOString().slice(0, 10) : value == null ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export async function evidenceCsv(): Promise<string> {
  const records = await prisma.evidenceRecord.findMany({ orderBy: { recordDate: "desc" } });
  const header = [
    "Date",
    "Category",
    "Impact",
    "What happened",
    "Why it mattered",
    "Business impact",
    "Goal supported",
    "Review language",
    "Source",
  ];
  const rows = records.map((r) =>
    [
      r.recordDate,
      r.category,
      r.impactLevel,
      r.whatHappened,
      r.whyItMattered,
      r.businessImpact,
      r.goalSupported,
      r.suggestedReviewLanguage,
      r.source,
    ]
      .map(csvCell)
      .join(","),
  );
  // Leading BOM so Excel on Windows opens it as UTF-8 (keeps dashes,
  // apostrophes, accented names intact).
  return "﻿" + [header.join(","), ...rows].join("\r\n");
}

// -------------------------------------------------------------- restore

export class BackupFormatError extends Error {}

function pickFields(row: unknown, fields: Record<string, string>): Row {
  if (!row || typeof row !== "object") throw new BackupFormatError("A row in the backup isn't an object.");
  const out: Row = {};
  for (const field of Object.values(fields)) {
    if (field in (row as Row)) out[field] = (row as Row)[field];
  }
  return out;
}

export async function restoreBackup(input: unknown): Promise<{ added: Record<TableKey, number>; skipped: Record<TableKey, number> }> {
  const backup = input as Partial<QcosBackup> | null;
  if (!backup || backup.app !== "qcos" || typeof backup.data !== "object" || backup.data === null) {
    throw new BackupFormatError("That file isn't a QCOS backup.");
  }
  if (typeof backup.version !== "number" || backup.version > BACKUP_VERSION) {
    throw new BackupFormatError("That backup was made by a newer version of QCOS.");
  }

  const rows = {} as Record<TableKey, Row[]>;
  for (const { key, fields } of TABLES) {
    const list = (backup.data as Record<string, unknown>)[key] ?? [];
    if (!Array.isArray(list)) throw new BackupFormatError(`"${key}" in the backup isn't a list.`);
    rows[key] = list.map((r) => pickFields(r, fields));
  }

  // One transaction: a malformed row anywhere means nothing is written.
  const added = await prisma.$transaction(
    async (tx) => {
      const opts = { skipDuplicates: true } as const;
      return {
        dailyEntries: (await tx.dailyEntry.createMany({ data: rows.dailyEntries as Prisma.DailyEntryCreateManyInput[], ...opts })).count,
        classifications: (await tx.classification.createMany({ data: rows.classifications as Prisma.ClassificationCreateManyInput[], ...opts })).count,
        evidenceRecords: (await tx.evidenceRecord.createMany({ data: rows.evidenceRecords as Prisma.EvidenceRecordCreateManyInput[], ...opts })).count,
        goalMetricEvents: (await tx.goalMetricEvent.createMany({ data: rows.goalMetricEvents as Prisma.GoalMetricEventCreateManyInput[], ...opts })).count,
        didThisCountLogs: (await tx.didThisCountLog.createMany({ data: rows.didThisCountLogs as Prisma.DidThisCountLogCreateManyInput[], ...opts })).count,
        monthlyReflections: (await tx.monthlyReflection.createMany({ data: rows.monthlyReflections as Prisma.MonthlyReflectionCreateManyInput[], ...opts })).count,
        weeklyDigests: (await tx.weeklyDigest.createMany({ data: rows.weeklyDigests as Prisma.WeeklyDigestCreateManyInput[], ...opts })).count,
        promotionReports: (await tx.promotionReport.createMany({ data: rows.promotionReports as Prisma.PromotionReportCreateManyInput[], ...opts })).count,
        gapChecks: (await tx.gapCheck.createMany({ data: rows.gapChecks as Prisma.GapCheckCreateManyInput[], ...opts })).count,
        inspectionVolumes: (await tx.inspectionVolume.createMany({ data: rows.inspectionVolumes as Prisma.InspectionVolumeCreateManyInput[], ...opts })).count,
        goalYears: (await tx.goalYear.createMany({ data: rows.goalYears as Prisma.GoalYearCreateManyInput[], ...opts })).count,
      } as Record<TableKey, number>;
    },
    { timeout: 30000 },
  );

  const skipped = Object.fromEntries(
    TABLES.map(({ key }) => [key, rows[key].length - added[key]]),
  ) as Record<TableKey, number>;
  return { added, skipped };
}
