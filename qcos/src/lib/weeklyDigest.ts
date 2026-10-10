import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { fromJson, toJson } from "@/lib/json";
import { startOfWeek, formatDate } from "@/lib/dates";
import { goalMetricLabel } from "@/lib/goals";
import type { Category, DigestSuggestion, GoalMetricKey } from "@/types";

// ---------------------------------------------------------------------------
// Weekly AI pattern pass. classifyEntry() only ever sees one entry at a
// time - this looks across a whole week of entries for things a per-entry
// classifier structurally can't catch: the same issue mentioned three times
// (a process-improvement candidate), a supplier that keeps coming up (a
// certification candidate), a skill taught repeatedly (worth a formal
// knowledge-sharing writeup), etc. Suggestions are informational only -
// nothing here writes to EvidenceRecord or GoalMetricEvent on its own; the
// user reviews and accepts each one from the homepage.
// ---------------------------------------------------------------------------

let client: Anthropic | null | undefined;

function getClient(): Anthropic | null {
  if (client !== undefined) return client;
  client = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;
  return client;
}

export interface WeekRange {
  start: Date;
  end: Date;
}

// The most recently completed Sun-Sat week (i.e. last week, not the one in
// progress) - a digest generated mid-week would miss days that haven't
// happened yet.
export function lastCompletedWeek(reference: Date = new Date()): WeekRange {
  const thisWeekStart = startOfWeek(reference);
  const start = new Date(thisWeekStart);
  start.setDate(start.getDate() - 7);
  const end = new Date(thisWeekStart.getTime() - 1);
  return { start, end };
}

const VALID_GOAL_KEYS: GoalMetricKey[] = [
  "no_inspect_candidate",
  "supplier_cert_candidate",
  "improvement_project",
  "qn_clarification_request",
  "communication_delay",
  "knowledge_sharing_event",
];

const VALID_CATEGORIES: Category[] = [
  "Routine Work",
  "Goal Contribution",
  "Cross-Functional Support",
  "Leadership",
  "Knowledge Sharing",
  "Technical Expertise",
  "Continuous Improvement",
  "Customer Support",
  "Problem Solving",
  "Promotion Evidence",
];

function parseSuggestions(raw: unknown): DigestSuggestion[] {
  if (!Array.isArray(raw)) return [];
  const suggestions: DigestSuggestion[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const description = "description" in item ? String((item as Record<string, unknown>).description ?? "") : "";
    if (!description.trim()) continue;
    const goalKeyRaw = (item as Record<string, unknown>).suggestedGoalKey;
    const categoryRaw = (item as Record<string, unknown>).suggestedCategory;
    suggestions.push({
      description: description.trim(),
      suggestedGoalKey: VALID_GOAL_KEYS.includes(goalKeyRaw as GoalMetricKey) ? (goalKeyRaw as GoalMetricKey) : null,
      suggestedCategory: VALID_CATEGORIES.includes(categoryRaw as Category) ? (categoryRaw as Category) : null,
    });
  }
  return suggestions.slice(0, 6);
}

async function generateWithAI(
  entries: { content: string; categories: Category[]; impactLevel: string }[],
): Promise<{ summary: string; suggestions: DigestSuggestion[] } | null> {
  const anthropic = getClient();
  if (!anthropic) return null;

  const goalKeyList = VALID_GOAL_KEYS.map((k) => `"${k}" (${goalMetricLabel(k)})`).join(", ");
  const categoryList = VALID_CATEGORIES.join(", ");

  const entryLines = entries
    .map((e, i) => `${i + 1}. [${e.impactLevel} impact, ${e.categories.join("/") || "uncategorized"}] ${e.content}`)
    .join("\n");

  try {
    const response = await anthropic.messages.create({
      model: "claude-opus-5",
      max_tokens: 1024,
      output_config: { effort: "low" },
      system:
        "You analyze a week of a Quality Technician's daily work logs for patterns a single-entry read would miss - a recurring issue, a supplier that keeps coming up, a skill taught more than once, a workflow gap. Respond with ONLY a JSON object, no markdown fences, no commentary, matching exactly: " +
        `{"summary": string (2-3 sentences, plain language, second person), "suggestions": [{"description": string, "suggestedGoalKey": one of [${goalKeyList}] or null, "suggestedCategory": one of [${categoryList}] or null}]}. ` +
        "Only include a suggestion when a real cross-entry pattern supports it (repetition, escalation, a trend) - never invent one from a single entry. Empty suggestions array is a valid and common answer. Never invent facts beyond what the entries say.",
      messages: [{ role: "user", content: `This week's entries:\n${entryLines}` }],
    });

    const block = response.content.find((b) => b.type === "text");
    const text = block && block.type === "text" ? block.text.trim() : "";
    const jsonText = text.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    const parsed = JSON.parse(jsonText);
    const summary = typeof parsed.summary === "string" && parsed.summary.trim() ? parsed.summary.trim() : null;
    if (!summary) return null;
    return { summary, suggestions: parseSuggestions(parsed.suggestions) };
  } catch (error) {
    console.error("Weekly digest AI pass failed, falling back to stats summary:", error);
    return null;
  }
}

function fallbackSummary(count: number, countedCount: number): string {
  if (count === 0) {
    return "Nothing was logged last week - whatever happens this week counts as a start.";
  }
  return `You logged ${count} ${count === 1 ? "entry" : "entries"} last week, ${countedCount} of which counted toward something. Add an ANTHROPIC_API_KEY to unlock pattern-spotting across the week.`;
}

// Generates (and stores) the digest for a given week if one doesn't already
// exist. Safe to call repeatedly - re-reads the existing row instead of
// re-generating.
export async function getOrCreateWeeklyDigest(range: WeekRange = lastCompletedWeek()) {
  const existing = await prisma.weeklyDigest.findUnique({ where: { weekStart: range.start } });
  if (existing) return existing;

  const entries = await prisma.dailyEntry.findMany({
    where: { entryDate: { gte: range.start, lte: range.end } },
    include: { classification: true },
    orderBy: { entryDate: "asc" },
  });

  const forAI = entries.map((e) => ({
    content: e.content,
    categories: fromJson<Category>(e.classification?.categories),
    impactLevel: e.classification?.impactLevel ?? "Low",
  }));
  const countedCount = entries.filter((e) => e.classification?.counts).length;

  const aiResult = entries.length > 0 ? await generateWithAI(forAI) : null;
  const summary = aiResult?.summary ?? fallbackSummary(entries.length, countedCount);
  const suggestions = aiResult?.suggestions ?? [];

  return prisma.weeklyDigest.create({
    data: {
      weekStart: range.start,
      weekEnd: range.end,
      entryCount: entries.length,
      summary,
      suggestions: toJson(suggestions),
    },
  });
}

export function formatWeekRange(range: WeekRange): string {
  return `${formatDate(range.start)} - ${formatDate(range.end)}`;
}
