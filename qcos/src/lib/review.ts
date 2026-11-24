import { prisma } from "@/lib/prisma";
import { GOAL_METRICS, goalMetricStatus, ANNUAL_GOAL } from "@/lib/goals";
import { formatMetrics, hasMetrics, metricsOf, sumMetrics, RESULT_METRICS } from "@/lib/metrics";
import { isInProgress, previousPeriod, type Period } from "@/lib/periods";
import { MONTH_NAMES } from "@/lib/dates";
import { getVolumeForRange } from "@/lib/volumeData";
import { unitsOutsideSapMonths, type VolumeTotals } from "@/lib/volume";
import type { EvidenceRecord } from "@prisma/client";

// ---------------------------------------------------------------------------
// Review reports for any period - Mid-Year (May review), Year-End (January
// review), a quarter, or a custom range - compiled only from evidence
// already saved in QCOS, never fabricated. Compared against the previous
// equivalent period so growth is visible, led by starred "top wins", and
// built around measurable results. Shared by the /review page (JSON) and
// the Word export.
// ---------------------------------------------------------------------------

const CATEGORY_TO_SECTION: Record<string, string> = {
  "Cross-Functional Support": "crossFunctionalSupport",
  Leadership: "leadership",
  "Knowledge Sharing": "knowledgeSharing",
  "Continuous Improvement": "continuousImprovement",
  "Goal Contribution": "goalAchievement",
  "Goal Contributions": "goalAchievement",
};

export const SECTION_LABELS: Record<string, string> = {
  crossFunctionalSupport: "Cross-Functional Support",
  leadership: "Leadership",
  knowledgeSharing: "Knowledge Sharing",
  continuousImprovement: "Continuous Improvement",
  goalAchievement: "Goal Achievement",
  other: "Additional Contributions",
};

function impactRank(level: string): number {
  return level === "High" ? 3 : level === "Medium" ? 2 : 1;
}

export interface ReportItem {
  id: string;
  date: string;
  text: string;
  result: string; // "" when no measurable result
  category: string;
  impactLevel: string;
  starred: boolean;
}

function toItem(r: EvidenceRecord): ReportItem {
  return {
    id: r.id,
    date: r.recordDate.toISOString(),
    text: r.suggestedReviewLanguage || r.whatHappened,
    result: formatMetrics(metricsOf(r)),
    category: r.category,
    impactLevel: r.impactLevel,
    starred: r.starred,
  };
}

// Starred first, then by impact, then wins with a measurable result, then
// most recent. Near-identical sentences only appear once.
function rankTopWins(records: EvidenceRecord[], limit: number): EvidenceRecord[] {
  const sorted = [...records].sort(
    (a, b) =>
      Number(b.starred) - Number(a.starred) ||
      impactRank(b.impactLevel) - impactRank(a.impactLevel) ||
      Number(hasMetrics(metricsOf(b))) - Number(hasMetrics(metricsOf(a))) ||
      b.recordDate.getTime() - a.recordDate.getTime(),
  );
  const seen = new Set<string>();
  const out: EvidenceRecord[] = [];
  for (const r of sorted) {
    const key = (r.suggestedReviewLanguage || r.whatHappened).trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
    if (out.length === limit) break;
  }
  return out;
}

function summarize(records: EvidenceRecord[]) {
  return {
    evidence: records.length,
    highImpact: records.filter((r) => r.impactLevel === "High").length,
    starred: records.filter((r) => r.starred).length,
    withResults: records.filter((r) => hasMetrics(metricsOf(r))).length,
    crossFunctional: records.filter((r) => r.category === "Cross-Functional Support").length,
    results: sumMetrics(records.map(metricsOf)),
  };
}

export type PeriodSummary = ReturnType<typeof summarize>;

// Months in the period with nothing logged - counted only from the first
// thing ever logged in QCOS, so months before you started using the app
// aren't flagged as gaps.
function monthsWithoutEvidence(period: Period, records: EvidenceRecord[], firstEverLogged: Date | null): string[] {
  if (!firstEverLogged) return [];
  const now = new Date();
  const end = period.end < now ? period.end : now;
  const have = new Set(records.map((r) => `${r.recordDate.getFullYear()}-${r.recordDate.getMonth()}`));
  const gaps: string[] = [];
  const from = period.start > firstEverLogged ? period.start : firstEverLogged;
  const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
  while (cursor <= end) {
    // the current month isn't a gap yet - it's still being logged
    const isCurrentMonth = cursor.getFullYear() === now.getFullYear() && cursor.getMonth() === now.getMonth();
    if (!isCurrentMonth && !have.has(`${cursor.getFullYear()}-${cursor.getMonth()}`)) {
      gaps.push(`${MONTH_NAMES[cursor.getMonth()].slice(0, 3)} ${cursor.getFullYear()}`);
    }
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return gaps;
}

function buildTalkingPoints(
  topWins: EvidenceRecord[],
  current: PeriodSummary,
  goals: { label: string; ytdActual: number; target: number; status: string; comparator: string }[],
  volume: VolumeTotals | null,
) {
  const promotion: string[] = [];
  const raise: string[] = [];

  if (volume && volume.inspected > 0) {
    raise.push(
      `Inspected ${volume.inspected.toLocaleString("en-US")} lots this period (SAP): ${volume.accepted.toLocaleString("en-US")} accepted, ${volume.rejected.toLocaleString("en-US")} rejected at inspection${volume.rejectRate !== null ? ` (${volume.rejectRate}% reject rate)` : ""}.`,
    );
  }

  for (const r of topWins.filter((w) => w.starred || w.impactLevel === "High").slice(0, 5)) {
    const result = formatMetrics(metricsOf(r));
    promotion.push(`${r.suggestedReviewLanguage || r.whatHappened}${result ? ` (Result: ${result})` : ""}`);
  }

  const resultBits = RESULT_METRICS.filter((m) => current.results[m.key] > 0).map(
    (m) => `${m.key === "costAvoided" ? `$${current.results[m.key].toLocaleString("en-US")}` : current.results[m.key].toLocaleString("en-US")} ${m.unit}`,
  );
  if (resultBits.length > 0) {
    raise.push(`Measurable results this period: ${resultBits.join(", ")}.`);
  }
  for (const g of goals.filter((g) => g.status === "green" && g.comparator === "min")) {
    raise.push(`Met the "${g.label}" target (${g.ytdActual} vs. target ${g.target}).`);
  }
  if (current.crossFunctional > 0) {
    raise.push(`${current.crossFunctional} documented instances of cross-functional support beyond core job scope.`);
  }

  if (promotion.length === 0) {
    promotion.push("Star your top wins in the Evidence Vault, or log high-impact entries, to build this out.");
  }
  if (raise.length === 0) {
    raise.push("Add measurable results (hours saved, defects caught, delays avoided) to your entries to build this out.");
  }
  return { promotion, raise };
}

export async function getPeriodReport(period: Period) {
  const prev = previousPeriod(period);
  const ytdStart = new Date(period.end.getFullYear(), 0, 1);

  const [records, prevRecords, periodGoalEvents, ytdGoalEvents, firstEntry] = await Promise.all([
    prisma.evidenceRecord.findMany({
      where: { recordDate: { gte: period.start, lte: period.end } },
      orderBy: { recordDate: "asc" },
    }),
    prisma.evidenceRecord.findMany({ where: { recordDate: { gte: prev.start, lte: prev.end } } }),
    prisma.goalMetricEvent.findMany({ where: { eventDate: { gte: period.start, lte: period.end } } }),
    prisma.goalMetricEvent.findMany({ where: { eventDate: { gte: ytdStart, lte: period.end } } }),
    prisma.dailyEntry.findFirst({ orderBy: { entryDate: "asc" }, select: { entryDate: true } }),
  ]);

  const count = (events: { metricKey: string }[]) => {
    const m = new Map<string, number>();
    for (const e of events) m.set(e.metricKey, (m.get(e.metricKey) ?? 0) + 1);
    return m;
  };
  const periodCounts = count(periodGoalEvents);
  const ytdCounts = count(ytdGoalEvents);

  // Annual targets are judged on the year to date at the end of the period;
  // the period's own contribution is shown alongside.
  const goals = GOAL_METRICS.map((m) => {
    const ytdActual = ytdCounts.get(m.key) ?? 0;
    return {
      label: m.label,
      target: m.target,
      comparator: m.comparator,
      periodActual: periodCounts.get(m.key) ?? 0,
      ytdActual,
      status: goalMetricStatus(m, ytdActual),
    };
  });

  const sections: Record<string, ReportItem[]> = {
    crossFunctionalSupport: [],
    leadership: [],
    knowledgeSharing: [],
    continuousImprovement: [],
    goalAchievement: [],
    other: [],
  };
  for (const r of rankTopWins(records, records.length)) {
    sections[CATEGORY_TO_SECTION[r.category] ?? "other"].push(toItem(r));
  }

  const current = summarize(records);
  const previous = summarize(prevRecords);
  const topWins = rankTopWins(records, 8);

  const [volume, prevVolume] = await Promise.all([
    getVolumeForRange(period.start, period.end),
    getVolumeForRange(prev.start, prev.end),
  ]);
  // SAP volume is the official lot count for the months it covers. Lots
  // mentioned in daily entries from those months are already inside the SAP
  // total, so only lots from months WITHOUT an SAP figure stay in the
  // results totals (each entry still shows its own lots as an example).
  current.results.unitsHandled = unitsOutsideSapMonths(records, volume?.months ?? []);
  previous.results.unitsHandled = unitsOutsideSapMonths(prevRecords, prevVolume?.months ?? []);

  return {
    period: {
      kind: period.kind,
      label: period.label,
      reviewNote: period.reviewNote,
      start: period.start.toISOString(),
      end: period.end.toISOString(),
      inProgress: isInProgress(period),
    },
    previousLabel: prev.label,
    goal: ANNUAL_GOAL,
    current,
    previous,
    topWins: topWins.map(toItem),
    goals,
    sections,
    volume: volume && volume.totals.months > 0 ? volume : null,
    previousVolume: prevVolume && prevVolume.totals.months > 0 ? prevVolume.totals : null,
    talkingPoints: buildTalkingPoints(topWins, current, goals, volume?.totals ?? null),
    health: {
      volumeMonthsMissing: volume?.missing ?? [],
      total: current.evidence,
      withResults: current.withResults,
      starred: current.starred,
      monthsWithoutEvidence: monthsWithoutEvidence(period, records, firstEntry?.entryDate ?? null),
      goalsWithoutEvidence: goals.filter((g) => g.comparator === "min" && g.ytdActual === 0).map((g) => g.label),
    },
  };
}

export type PeriodReport = Awaited<ReturnType<typeof getPeriodReport>>;
