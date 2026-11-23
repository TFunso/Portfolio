import { prisma } from "@/lib/prisma";
import { fromJson, toJson } from "@/lib/json";
import { formatDate } from "@/lib/dates";
import { CLAUDE_MODEL, REFUSAL_FALLBACK, getAnthropic, responseText } from "@/lib/claude";
import type { GapEvidenceRef, GapRequirement, GapStatus } from "@/types";
import { formatMetrics, metricsOf } from "@/lib/metrics";

// ---------------------------------------------------------------------------
// Promotion Gap Check. Takes the job description of the role you want and
// judges each of its requirements against your Evidence Vault:
//   covered - several solid examples you can point to
//   thin    - one or two examples, or only indirect ones
//   missing - nothing logged that shows it
// plus the specific entries that prove it and what to log next.
//
// With ANTHROPIC_API_KEY: one Claude call extracts the real requirements
// (skipping "about us"/benefits filler) and maps evidence by meaning, using
// structured JSON output. Evidence references the model returns are
// checked against the vault - an unknown reference is dropped, and a
// "covered" verdict with no valid proof is downgraded to "thin", so the
// result can only ever cite entries you actually logged.
// Without a key: deterministic keyword matching over the same data.
// ---------------------------------------------------------------------------

const MAX_EVIDENCE_FOR_AI = 500;
const MAX_REFS_PER_REQUIREMENT = 4;
const IMPACT_RANK: Record<string, number> = { High: 0, Medium: 1, Low: 2 };

interface VaultItem {
  ref: string; // short handle given to the model, e.g. "E12"
  id: string;
  date: Date;
  impactLevel: string;
  category: string;
  text: string; // review-ready sentence (or raw "what happened")
  detail: string; // extra context for matching
}

export interface GapCheckResult {
  id: string;
  jobTitle: string;
  jobDescription: string;
  summary: string;
  requirements: GapRequirement[];
  aiGenerated: boolean;
  evidenceCount: number;
  createdAt: Date;
}

async function loadVault(): Promise<VaultItem[]> {
  const records = await prisma.evidenceRecord.findMany({ orderBy: { recordDate: "desc" } });
  return records
    .sort(
      (a, b) =>
        Number(b.starred) - Number(a.starred) || (IMPACT_RANK[a.impactLevel] ?? 3) - (IMPACT_RANK[b.impactLevel] ?? 3),
    )
    .map((r, i) => ({
      ref: `E${i + 1}`,
      id: r.id,
      date: r.recordDate,
      impactLevel: r.impactLevel,
      category: r.category,
      text: r.suggestedReviewLanguage || r.whatHappened,
      detail: [
        r.starred ? "[TOP WIN]" : "",
        formatMetrics(metricsOf(r)) ? `Result: ${formatMetrics(metricsOf(r))}.` : "",
        r.whatHappened,
        r.whyItMattered,
        r.businessImpact,
        r.goalSupported ?? "",
      ].join(" "),
    }));
}

function toRef(item: VaultItem): GapEvidenceRef {
  return { id: item.id, date: item.date.toISOString(), text: item.text };
}

// Up to MAX_REFS_PER_REQUIREMENT proof points, skipping repeats of the same
// sentence (the vault can hold near-identical entries logged twice).
function pickRefs(items: VaultItem[]): GapEvidenceRef[] {
  const seen = new Set<string>();
  const out: GapEvidenceRef[] = [];
  for (const item of items) {
    const key = item.text.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(toRef(item));
    if (out.length === MAX_REFS_PER_REQUIREMENT) break;
  }
  return out;
}

// ---------------------------------------------------------------- AI path

const GAP_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "requirements"],
  properties: {
    summary: { type: "string" },
    requirements: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["requirement", "status", "evidenceRefs", "note", "nextStep"],
        properties: {
          requirement: { type: "string" },
          status: { type: "string", enum: ["covered", "thin", "missing"] },
          evidenceRefs: { type: "array", items: { type: "string" } },
          note: { type: "string" },
          nextStep: { type: "string" },
        },
      },
    },
  },
};

interface AiRequirement {
  requirement: string;
  status: GapStatus;
  evidenceRefs: string[];
  note: string;
  nextStep: string;
}

async function analyzeWithClaude(
  jobTitle: string,
  jobDescription: string,
  vault: VaultItem[],
): Promise<{ summary: string; requirements: GapRequirement[] } | null> {
  const anthropic = getAnthropic();
  if (!anthropic) return null;

  const items = vault.slice(0, MAX_EVIDENCE_FOR_AI);
  const byRef = new Map(items.map((v) => [v.ref, v]));
  const evidenceLines = items
    .map((v) => `${v.ref} | ${formatDate(v.date)} | ${v.impactLevel} | ${v.category} | ${v.text} || ${v.detail.slice(0, 240)}`)
    .join("\n");

  try {
    const response = await anthropic.beta.messages.create({
      ...REFUSAL_FALLBACK,
      model: CLAUDE_MODEL,
      max_tokens: 16000,
      output_config: {
        effort: "low",
        format: { type: "json_schema", schema: GAP_SCHEMA },
      },
      system: [
        "You help a Quality Technician prepare for a promotion conversation by comparing the job description of the role they want against their logged work evidence.",
        "First extract the 6-15 concrete requirements from the job description (skills, responsibilities, qualifications). Skip company boilerplate, benefits, and EEO text. Merge near-duplicates. Keep each requirement short, in the job description's own words where possible.",
        "Then judge each requirement against the evidence list. status: 'covered' = two or more entries clearly demonstrate it; 'thin' = one entry, or only indirect/partial examples; 'missing' = nothing in the evidence shows it.",
        "evidenceRefs: the E-numbers (e.g. 'E12') of up to 4 entries that best demonstrate the requirement, strongest first. Only cite entries from the list; never invent references. Empty for 'missing'.",
        "note: one short sentence on why it got that status, grounded in the evidence. nextStep: one specific, practical action for the next 90 days - what to do or what kind of example to log - written in second person. Never invent facts about the person beyond the evidence.",
        "summary: 2-3 plain sentences in second person: overall readiness, the strongest area, and the most important gap to close.",
        "Formal requirements the work log can't show (degrees, certifications, years of experience) should be 'missing' only if nothing indicates them, with a nextStep that says to confirm it directly with the manager or HR.",
      ].join(" "),
      messages: [
        {
          role: "user",
          content: `Target role: ${jobTitle}\n\nJob description:\n${jobDescription}\n\nEvidence (${items.length} entries; ref | date | impact | category | review sentence || details):\n${evidenceLines || "(no evidence logged yet)"}`,
        },
      ],
    });

    const text = responseText(response);
    if (!text) return null;
    const parsed = JSON.parse(text) as { summary: string; requirements: AiRequirement[] };
    if (!Array.isArray(parsed.requirements) || parsed.requirements.length === 0) return null;

    const requirements: GapRequirement[] = parsed.requirements.map((r) => {
      const evidence = pickRefs(
        (r.evidenceRefs ?? [])
          .map((ref) => byRef.get(ref.trim().toUpperCase()))
          .filter((v): v is VaultItem => Boolean(v)),
      );
      let status: GapStatus = r.status;
      if (status === "covered" && evidence.length === 0) status = "thin";
      if (status === "missing") evidence.length = 0;
      return { requirement: r.requirement, status, evidence, note: r.note, nextStep: r.nextStep };
    });

    return { summary: parsed.summary?.trim() || buildSummary(requirements, true), requirements };
  } catch (error) {
    console.error("Gap check AI pass failed, falling back to keyword matching:", error);
    return null;
  }
}

// ------------------------------------------------------- keyword fallback

const STOPWORDS = new Set(
  (
    "a an and are as at be by for from has have in into is it of on or our the their this to will with you your " +
    "ability able must should may can including include etc other duties as assigned responsible responsibilities " +
    "perform provide ensure strong excellent good work working skills skill knowledge experience years year " +
    "required requirements preferred minimum plus related relevant various within across team teams job role position " +
    "candidate company support using use ensure maintain"
  ).split(/\s+/),
);

function stem(word: string): string {
  if (word.length > 6 && word.endsWith("ing")) return word.slice(0, -3);
  if (word.length > 5 && word.endsWith("ed")) return word.slice(0, -2);
  if (word.length > 5 && word.endsWith("es")) return word.slice(0, -2);
  if (word.length > 4 && word.endsWith("s")) return word.slice(0, -1);
  return word;
}

function keywords(text: string): string[] {
  const words = text.toLowerCase().match(/[a-z0-9&]+/g) ?? [];
  return Array.from(new Set(words.filter((w) => w.length >= 3 && !STOPWORDS.has(w)).map(stem)));
}

export function splitRequirements(jobDescription: string, jobTitle = ""): string[] {
  const title = jobTitle.trim().toLowerCase();
  const lines = jobDescription
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*(?:[-*•·▪◦]|\d+[.)])\s*/, "").trim())
    .filter((l) => l.length >= 20 && l.length <= 300 && !l.endsWith(":"))
    // the posting's own title line isn't a requirement
    .filter((l) => !title || l.toLowerCase() !== title);

  const candidates =
    lines.length >= 3
      ? lines
      : jobDescription
          .split(/(?<=[.;])\s+/)
          .map((s) => s.trim())
          .filter((s) => s.length >= 20 && s.length <= 300);

  return candidates.filter((c) => keywords(c).length > 0).slice(0, 15);
}

function analyzeWithKeywords(jobTitle: string, jobDescription: string, vault: VaultItem[]): { summary: string; requirements: GapRequirement[] } {
  const vaultTokens = vault.map((v) => ({ item: v, tokens: new Set(keywords(`${v.text} ${v.detail} ${v.category}`)) }));

  const requirements: GapRequirement[] = splitRequirements(jobDescription, jobTitle).map((requirement) => {
    const reqWords = keywords(requirement);
    const needed = Math.min(2, reqWords.length);
    const matches = vaultTokens
      .map(({ item, tokens }) => ({ item, hits: reqWords.filter((w) => tokens.has(w)).length }))
      .filter((m) => m.hits >= needed)
      .sort((a, b) => b.hits - a.hits || (IMPACT_RANK[a.item.impactLevel] ?? 3) - (IMPACT_RANK[b.item.impactLevel] ?? 3));

    const status: GapStatus = matches.length >= 3 ? "covered" : matches.length >= 1 ? "thin" : "missing";
    const evidence = pickRefs(matches.map((m) => m.item));
    const note =
      status === "missing"
        ? "No logged entry shares this requirement's key terms."
        : `${matches.length} logged ${matches.length === 1 ? "entry shares" : "entries share"} this requirement's key terms.`;
    const nextStep =
      status === "covered"
        ? "Well supported - pick your strongest example to lead with in the conversation."
        : status === "thin"
          ? "Log the next few times you do this, and include a number (time saved, lots, defects caught) when you can."
          : "Look for a chance to do this in the next 90 days and log it the same day. If it's a formal requirement (degree, certification, years), confirm it directly with your manager or HR.";
    return { requirement, status, evidence, note, nextStep };
  });

  return { summary: buildSummary(requirements, false), requirements };
}

function buildSummary(requirements: GapRequirement[], ai: boolean): string {
  const count = (s: GapStatus) => requirements.filter((r) => r.status === s).length;
  const base = `${count("covered")} of ${requirements.length} requirements are covered by your logged evidence, ${count("thin")} are thin, and ${count("missing")} have no evidence yet.`;
  return ai
    ? base
    : `${base} (Matched by shared keywords - add an ANTHROPIC_API_KEY for a read that understands meaning, not just matching words.)`;
}

// ----------------------------------------------------------------- public

function hydrate(row: {
  id: string;
  jobTitle: string;
  jobDescription: string;
  summary: string;
  requirements: string;
  aiGenerated: boolean;
  evidenceCount: number;
  createdAt: Date;
}): GapCheckResult {
  return { ...row, requirements: fromJson<GapRequirement>(row.requirements) };
}

export async function runGapCheck(jobTitle: string, jobDescription: string): Promise<GapCheckResult> {
  const vault = await loadVault();
  const ai = await analyzeWithClaude(jobTitle, jobDescription, vault);
  const result = ai ?? analyzeWithKeywords(jobTitle, jobDescription, vault);

  const row = await prisma.gapCheck.create({
    data: {
      jobTitle,
      jobDescription,
      summary: result.summary,
      requirements: toJson(result.requirements),
      aiGenerated: Boolean(ai),
      evidenceCount: vault.length,
    },
  });
  return hydrate(row);
}

export async function listGapChecks(limit = 10): Promise<GapCheckResult[]> {
  const rows = await prisma.gapCheck.findMany({ orderBy: { createdAt: "desc" }, take: limit });
  return rows.map(hydrate);
}
