import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { fromJson } from "@/lib/json";
import { startOfYear, endOfYear, formatDate } from "@/lib/dates";
import { GOAL_METRICS, goalMetricStatus, ANNUAL_GOAL } from "@/lib/goals";
import type { Category, Department } from "@/types";

export type PromotionReportScope = { type: "all-time" } | { type: "year"; year: number };

export function scopeKey(scope: PromotionReportScope): string {
  return scope.type === "all-time" ? "all-time" : `year-${scope.year}`;
}

export function scopeLabel(scope: PromotionReportScope): string {
  return scope.type === "all-time" ? "All-Time" : String(scope.year);
}

export function parseScope(scopeParam: string | null, yearParam: string | null): PromotionReportScope {
  if (scopeParam === "year") {
    return { type: "year", year: Number(yearParam) || new Date().getFullYear() };
  }
  return { type: "all-time" };
}

// ---------------------------------------------------------------------------
// The Promotion Report is a different deliverable from the Year-End Review:
// not a comprehensive, section-by-section compilation of every category,
// but a curated ONE-PAGE narrative built to hand to a manager - "where do I
// shine, where have I shown leadership and ownership, how have I grown."
// It can span the whole evidence history ("all-time"), not just one year.
//
// The AI pass only ever sees facts already extracted and saved by the
// classifier/evidence pipeline (never raw speculation) and is explicitly
// told not to invent specifics beyond them. Without ANTHROPIC_API_KEY, or
// if the call fails, a deterministic (non-narrative) compilation is stored
// instead - still useful, just not written prose.
// ---------------------------------------------------------------------------

let client: Anthropic | null | undefined;

function getClient(): Anthropic | null {
  if (client !== undefined) return client;
  client = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;
  return client;
}

const MAX_RECORDS_FOR_DIGEST = 120;

function impactRank(level: string): number {
  return level === "High" ? 3 : level === "Medium" ? 2 : 1;
}

interface GatheredData {
  records: {
    recordDate: Date;
    whatHappened: string;
    suggestedReviewLanguage: string;
    businessImpact: string;
    category: string;
    impactLevel: string;
  }[];
  evidenceCount: number;
  categoryTotals: { category: string; count: number }[];
  crossFunctional: { department: string; count: number }[];
  goalProgress: { label: string; actual: number; target: number; comparator: string; status: string }[];
  impactTotals: { high: number; medium: number; low: number };
  monthly: { monthKey: string; label: string; count: number }[];
}

const MAX_MONTHS_ALL_TIME = 24;

// Evidence counts per month across the scope: Jan-Dec for a year (stopping
// at the current month for the current year), or from the first logged
// month to now for all-time, capped to the most recent 24 months so the
// chart stays readable.
function monthlyCounts(scope: PromotionReportScope, dates: Date[]): { monthKey: string; label: string; count: number }[] {
  if (dates.length === 0) return [];
  const now = new Date();
  let start: Date;
  let end: Date;
  if (scope.type === "year") {
    start = new Date(scope.year, 0, 1);
    end = scope.year === now.getFullYear() ? new Date(now.getFullYear(), now.getMonth(), 1) : new Date(scope.year, 11, 1);
  } else {
    const first = dates[0];
    start = new Date(first.getFullYear(), first.getMonth(), 1);
    end = new Date(now.getFullYear(), now.getMonth(), 1);
    const earliestAllowed = new Date(end.getFullYear(), end.getMonth() - (MAX_MONTHS_ALL_TIME - 1), 1);
    if (start < earliestAllowed) start = earliestAllowed;
  }

  const counts = new Map<string, number>();
  for (const d of dates) {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const spansYears = start.getFullYear() !== end.getFullYear();
  const months: { monthKey: string; label: string; count: number }[] = [];
  for (let m = new Date(start); m <= end; m = new Date(m.getFullYear(), m.getMonth() + 1, 1)) {
    const key = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}`;
    const name = m.toLocaleDateString("en-US", { month: "short" });
    months.push({ monthKey: key, label: spansYears ? `${name} '${String(m.getFullYear()).slice(2)}` : name, count: counts.get(key) ?? 0 });
  }
  return months;
}

async function gatherData(scope: PromotionReportScope): Promise<GatheredData> {
  const range =
    scope.type === "year"
      ? { gte: startOfYear(new Date(scope.year, 0, 1)), lte: endOfYear(new Date(scope.year, 0, 1)) }
      : undefined;

  const [allRecords, classifications, goalEvents] = await Promise.all([
    prisma.evidenceRecord.findMany({
      where: range ? { recordDate: range } : undefined,
      orderBy: { recordDate: "asc" },
    }),
    prisma.classification.findMany({
      where: {
        entry: range ? { entryDate: range } : undefined,
        categories: { contains: "Cross-Functional Support" },
      },
    }),
    prisma.goalMetricEvent.findMany({
      where: {
        eventDate: scope.type === "year" ? range : { gte: startOfYear(new Date()), lte: endOfYear(new Date()) },
      },
    }),
  ]);

  const categoryCounts = new Map<string, number>();
  for (const r of allRecords) categoryCounts.set(r.category, (categoryCounts.get(r.category) ?? 0) + 1);
  const categoryTotals = Array.from(categoryCounts.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);

  const deptCounts = new Map<Department, number>();
  for (const c of classifications) {
    const categories = fromJson<Category>(c.categories);
    if (!categories.includes("Cross-Functional Support")) continue;
    const depts = fromJson<Department>(c.departments);
    for (const d of depts.length > 0 ? depts : (["Operations"] as Department[])) {
      deptCounts.set(d, (deptCounts.get(d) ?? 0) + 1);
    }
  }
  const crossFunctional = Array.from(deptCounts.entries())
    .map(([department, count]) => ({ department, count }))
    .sort((a, b) => b.count - a.count);

  const goalCounts = new Map<string, number>();
  for (const e of goalEvents) goalCounts.set(e.metricKey, (goalCounts.get(e.metricKey) ?? 0) + 1);
  const goalProgress = GOAL_METRICS.map((m) => {
    const actual = goalCounts.get(m.key) ?? 0;
    return { label: m.label, actual, target: m.target, comparator: m.comparator, status: goalMetricStatus(m, actual) };
  });

  // Curate down to the most load-bearing records when there's a lot of
  // history - highest impact first, chronological within each tier, so the
  // digest stays a manageable size without just dropping the oldest/newest.
  const curated = [...allRecords]
    .sort((a, b) => impactRank(b.impactLevel) - impactRank(a.impactLevel))
    .slice(0, MAX_RECORDS_FOR_DIGEST)
    .sort((a, b) => a.recordDate.getTime() - b.recordDate.getTime());

  const impactTotals = { high: 0, medium: 0, low: 0 };
  for (const r of allRecords) {
    if (r.impactLevel === "High") impactTotals.high++;
    else if (r.impactLevel === "Medium") impactTotals.medium++;
    else impactTotals.low++;
  }

  return {
    records: curated,
    evidenceCount: allRecords.length,
    categoryTotals,
    crossFunctional,
    goalProgress,
    impactTotals,
    monthly: monthlyCounts(
      scope,
      allRecords.map((r) => r.recordDate),
    ),
  };
}

export type PromotionStats = Omit<GatheredData, "records"> & { scopeLabel: string };

// The numbers behind the Promotion Report's visual dashboard - computed
// live from the vault on every request (no AI, no caching needed), so the
// dashboard is always current even when the cached narrative is older.
export async function getPromotionStats(scope: PromotionReportScope): Promise<PromotionStats> {
  const data = await gatherData(scope);
  return {
    evidenceCount: data.evidenceCount,
    categoryTotals: data.categoryTotals,
    crossFunctional: data.crossFunctional,
    goalProgress: data.goalProgress,
    impactTotals: data.impactTotals,
    monthly: data.monthly,
    scopeLabel: scopeLabel(scope),
  };
}

function buildDigestText(data: GatheredData): string {
  const lines = data.records.map(
    (r) => `[${formatDate(r.recordDate)}] (${r.impactLevel}, ${r.category}) ${r.suggestedReviewLanguage || r.whatHappened}`,
  );
  const categoryLine = data.categoryTotals.map((c) => `${c.category}: ${c.count}`).join("; ");
  const deptLine = data.crossFunctional.map((d) => `${d.department}: ${d.count}`).join("; ") || "none logged";
  const goalLine = data.goalProgress
    .map(
      (g) =>
        `${g.label}: ${g.actual}${g.comparator !== "ongoing" ? ` / ${g.comparator === "max" ? `fewer than ${g.target + 1}` : g.target}` : ""} (${g.status})`,
    )
    .join("; ");

  return [
    `Evidence entries (chronological, ${data.evidenceCount} total${data.records.length < data.evidenceCount ? `, highest-impact ${data.records.length} shown` : ""}):`,
    ...lines,
    "",
    `Category totals across all evidence: ${categoryLine}`,
    `Cross-functional support by team: ${deptLine}`,
    `Current-year DRIVE EFFICIENCY goal progress: ${goalLine}`,
  ].join("\n");
}

const SECTION_HEADERS = [
  "Overview",
  "Where I Shine",
  "Leadership & Ownership",
  "Growth Over Time",
  "Impact By The Numbers",
  "Bottom Line",
];

async function generateNarrative(data: GatheredData, scopeLbl: string): Promise<string | null> {
  const anthropic = getClient();
  if (!anthropic) return null;

  try {
    const response = await anthropic.messages.create({
      model: "claude-opus-5",
      max_tokens: 2000,
      output_config: { effort: "medium" },
      system: [
        `You write a concise, ONE-PAGE (450-650 words total) promotion case for a Quality Technician, to be handed directly to their manager for a promotion/performance discussion.`,
        `Use ONLY the facts provided below - never invent names, numbers, outcomes, dates, or details beyond what's given. If the evidence is thin in an area, say less about it rather than padding with generic claims.`,
        `Structure the output as exactly these sections, each as a "## Header" line followed by content: ${SECTION_HEADERS.join(", ")}.`,
        `"Overview": 2-3 sentences framing their overall trajectory and case for promotion.`,
        `"Where I Shine": 3-5 bullet points ("- " prefix), each naming a recurring strength theme with one concrete grounded example.`,
        `"Leadership & Ownership": a short paragraph or 2-3 bullets on initiative/ownership shown, grounded in the evidence.`,
        `"Growth Over Time": a short paragraph noting any visible trajectory across the dated entries (new skills, bigger scope, more complex problems) - only claim growth the dates/content actually support.`,
        `"Impact By The Numbers": bullets of the goal-progress and cross-functional totals given.`,
        `"Bottom Line": 1-2 closing sentences making the case plainly.`,
        `Output plain text only - no markdown bold/italics, no extra commentary before or after the sections.`,
      ].join(" "),
      messages: [{ role: "user", content: `Scope: ${scopeLbl}\n\n${buildDigestText(data)}` }],
    });

    const block = response.content.find((b) => b.type === "text");
    const text = block && block.type === "text" ? block.text.trim() : "";
    return text || null;
  } catch (error) {
    console.error("Promotion report AI synthesis failed, falling back to compiled version:", error);
    return null;
  }
}

function buildFallback(data: GatheredData, scopeLbl: string): string {
  const lines: string[] = [];
  lines.push("## Overview");
  lines.push(
    `${data.evidenceCount} pieces of evidence logged (${scopeLbl}). Add an ANTHROPIC_API_KEY to generate an AI-written narrative version of this report - below is a compiled summary of the same data.`,
  );

  lines.push("## Where I Shine");
  for (const c of data.categoryTotals.slice(0, 5)) {
    lines.push(`- ${c.category}: ${c.count} logged instance${c.count === 1 ? "" : "s"}`);
  }

  const topRecords = [...data.records].sort((a, b) => impactRank(b.impactLevel) - impactRank(a.impactLevel)).slice(0, 8);
  lines.push("## Leadership & Ownership");
  for (const r of topRecords) {
    lines.push(`- ${r.suggestedReviewLanguage || r.whatHappened}`);
  }

  lines.push("## Growth Over Time");
  lines.push("Not available without an AI pass - the compiled version lists accomplishments but doesn't analyze trajectory.");

  lines.push("## Impact By The Numbers");
  for (const g of data.goalProgress) {
    lines.push(
      `- ${g.label}: ${g.actual}${g.comparator !== "ongoing" ? ` / ${g.comparator === "max" ? `fewer than ${g.target + 1}` : g.target}` : ""} (${g.status})`,
    );
  }
  for (const d of data.crossFunctional.slice(0, 5)) {
    lines.push(`- Supported ${d.department}: ${d.count} time${d.count === 1 ? "" : "s"}`);
  }

  lines.push("## Bottom Line");
  lines.push(`${data.evidenceCount} documented contributions toward ${ANNUAL_GOAL.name} and team support this period.`);

  return lines.join("\n");
}

export async function generatePromotionReport(scope: PromotionReportScope) {
  const data = await gatherData(scope);
  const scopeLbl = scopeLabel(scope);

  const narrative = data.evidenceCount > 0 ? await generateNarrative(data, scopeLbl) : null;
  const content =
    narrative ??
    (data.evidenceCount === 0
      ? "## Overview\nNo evidence logged yet for this scope. Log daily entries and evidence first, then generate this report."
      : buildFallback(data, scopeLbl));

  return prisma.promotionReport.upsert({
    where: { scope: scopeKey(scope) },
    update: { scopeLabel: scopeLbl, content, aiGenerated: Boolean(narrative), evidenceCount: data.evidenceCount, generatedAt: new Date() },
    create: {
      scope: scopeKey(scope),
      scopeLabel: scopeLbl,
      content,
      aiGenerated: Boolean(narrative),
      evidenceCount: data.evidenceCount,
    },
  });
}

export async function getCachedPromotionReport(scope: PromotionReportScope) {
  return prisma.promotionReport.findUnique({ where: { scope: scopeKey(scope) } });
}
