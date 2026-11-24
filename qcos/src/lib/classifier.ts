import type {
  Category,
  ClassificationResult,
  Department,
  DidThisCountResult,
  GoalMetricKey,
  ImpactLevel,
} from "@/types";
import { SIR_PATTERNS } from "@/lib/metrics";
import { DEFAULT_GOAL_SET, goalMetricLabel, type GoalMetricDefinition } from "@/lib/goals";

// ---------------------------------------------------------------------------
// The "AI Achievement Detector". This is a deterministic, explainable rules
// engine rather than a call to a hosted LLM - by design. QCOS's non-
// negotiable requirements are fast, offline, local-first capture, and a
// user should never have to decide "does this count?" themselves or wait on
// a network round trip. A keyword/pattern engine gives instant, reproducible
// answers with zero external dependency or API cost.
//
// If a hosted-LLM classifier is wanted later, it's a drop-in: implement the
// same `classifyEntry(content): ClassificationResult` signature and swap the
// import in the API routes that call it.
// ---------------------------------------------------------------------------

interface KeywordRule {
  category: Category;
  keywords: string[];
  // Whole-word patterns for short acronyms that would otherwise match
  // inside other words ("sir" in "desire").
  patterns?: RegExp[];
  weight: number;
}


const CATEGORY_RULES: KeywordRule[] = [
  // First article inspection (SIR) - listed first so it becomes the
  // evidence record's primary category. Long, technical work that verifies
  // a part against its drawing and specs; weighted high so it always counts.
  {
    category: "First Article (SIR)",
    keywords: [],
    patterns: SIR_PATTERNS,
    weight: 3,
  },
  {
    category: "Goal Contribution",
    keywords: [
      "inspect",
      "inspection",
      "lot",
      "hot sheet",
      "hotsheet",
      "priority",
      "qn",
      "quality notification",
      "no inspect",
      "supplier cert",
      "certification",
    ],
    weight: 2,
  },
  {
    category: "Cross-Functional Support",
    keywords: [
      "helped",
      "help ",
      "assisted",
      "assist ",
      "supported",
      "support ",
      "planner",
      "planning",
      "buyer",
      "purchasing",
      "warehouse",
      "manufacturing",
      "operations",
      "coordinated",
      "coordination",
      "cross-functional",
      "cross functional",
    ],
    weight: 2,
  },
  {
    category: "Leadership",
    keywords: [
      "led ",
      "leading",
      "trained",
      "mentored",
      "owned",
      "drove",
      "organized",
      "decided",
      "spearheaded",
      "initiated",
    ],
    weight: 2,
  },
  {
    category: "Knowledge Sharing",
    keywords: [
      "taught",
      "shared",
      "showed",
      "explained",
      "documented",
      "wrote a guide",
      "trained",
      "walked through",
      "demoed",
      "demonstrated",
      "learned a new",
      "learned new",
    ],
    weight: 2,
  },
  {
    category: "Technical Expertise",
    keywords: [
      "technique",
      "root cause",
      "drawing",
      "gd&t",
      "tolerance",
      "deviation",
      "measurement",
      "calibration",
      "cmm",
      "blueprint",
      "print interpretation",
      "nonconform",
      "non-conform",
      "discrepanc",
    ],
    // whole word only - a plain "spec" keyword matched inside "inspected"
    patterns: [/\bspecs?\b/, /\bspecifications?\b/],
    weight: 1.5,
  },
  {
    category: "Continuous Improvement",
    keywords: [
      "improve",
      "improvement",
      "improved",
      "process",
      "streamlin",
      "efficien",
      "reduce",
      "reduced",
      "eliminate",
      "automat",
      "optimiz",
    ],
    weight: 2,
  },
  {
    category: "Customer Support",
    keywords: ["customer", "urgent", "escalation", "escalated", "client"],
    weight: 1.5,
  },
  {
    category: "Problem Solving",
    keywords: [
      "resolved",
      "fixed",
      "troubleshoot",
      "investigat",
      "root cause",
      "diagnosed",
      "figured out",
      "solved",
    ],
    weight: 1.5,
  },
];

const DEPARTMENT_RULES: { department: Department; keywords: string[] }[] = [
  { department: "Planning", keywords: ["planner", "planning", "schedule"] },
  { department: "Buyers", keywords: ["buyer", "purchasing", "procurement", "po ", "purchase order"] },
  { department: "Quality Engineers", keywords: ["qe ", "quality engineer", "qe's", "qe investigation"] },
  { department: "Manufacturing Engineers", keywords: ["manufacturing engineer", "me ", "process engineer"] },
  { department: "Warehouse", keywords: ["warehouse", "receiving dock", "stockroom"] },
  { department: "Receiving Inspection Team", keywords: ["receiving inspection", "incoming inspection", "receiving team"] },
  { department: "Operations", keywords: ["operations", "ops team", "production floor", "line "] },
];

// Goal keyword rules come from the year's goals (GoalMetricDefinition.keywords).

const HIGH_IMPACT_SIGNALS = [
  "urgent",
  "escalat",
  "prevent",
  "root cause",
  "led ",
  "critical",
  "deadline",
  "shutdown",
  "stopped the line",
  "saved",
];

function normalize(text: string): string {
  return ` ${text.toLowerCase()} `;
}

function matchKeywords(normalized: string, keywords: string[]): string[] {
  return keywords.filter((kw) => normalized.includes(kw.toLowerCase()));
}

function scoreCategories(normalized: string): { categories: Category[]; score: number } {
  const matched: Category[] = [];
  let score = 0;
  for (const rule of CATEGORY_RULES) {
    const hits = matchKeywords(normalized, rule.keywords).length + (rule.patterns ?? []).filter((re) => re.test(normalized)).length;
    if (hits > 0) {
      matched.push(rule.category);
      score += hits * rule.weight;
    }
  }
  return { categories: matched, score };
}

function detectDepartments(normalized: string): Department[] {
  const departments: Department[] = [];
  for (const rule of DEPARTMENT_RULES) {
    if (matchKeywords(normalized, rule.keywords).length > 0) {
      departments.push(rule.department);
    }
  }
  return departments;
}

function detectGoalKeys(normalized: string, goalMetrics: GoalMetricDefinition[]): GoalMetricKey[] {
  const keys: GoalMetricKey[] = [];
  for (const metric of goalMetrics) {
    const keywords = metric.keywords.map((k) => k.trim()).filter(Boolean);
    if (keywords.length > 0 && matchKeywords(normalized, keywords).length > 0) {
      keys.push(metric.key);
    }
  }
  return keys;
}

function impactLevel(normalized: string, categories: Category[], score: number): ImpactLevel {
  const highSignal = HIGH_IMPACT_SIGNALS.some((s) => normalized.includes(s));
  if (highSignal || categories.length >= 3 || score >= 6) return "High";
  if (categories.length >= 1 || score >= 2) return "Medium";
  return "Low";
}

function buildReason(categories: Category[], departments: Department[]): string {
  if (categories.length === 0) {
    return "Reads as routine, self-contained work with no clear downstream impact captured yet.";
  }
  const parts: string[] = [];
  if (categories.includes("Cross-Functional Support") && departments.length > 0) {
    parts.push(`supported ${departments.join(", ")}`);
  } else if (categories.includes("Cross-Functional Support")) {
    parts.push("supported another team or function");
  }
  if (categories.includes("First Article (SIR)")) parts.push("verified a part against its drawing and specs through first article (SIR) inspection");
  if (categories.includes("Goal Contribution")) parts.push("directly advanced an annual goal objective");
  if (categories.includes("Continuous Improvement")) parts.push("improved a process or reduced waste");
  if (categories.includes("Leadership")) parts.push("showed initiative or ownership");
  if (categories.includes("Knowledge Sharing")) parts.push("built team capability");
  if (categories.includes("Technical Expertise")) parts.push("applied specialized technical judgment");
  if (categories.includes("Problem Solving")) parts.push("resolved a problem instead of just flagging it");
  if (categories.includes("Customer Support")) parts.push("protected a customer or urgent commitment");

  if (parts.length === 0) {
    return "Contributes to team output in a way worth documenting.";
  }
  const joined = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
  return `This ${joined}.`;
}

function buildProfessionalSummary(
  content: string,
  categories: Category[],
  departments: Department[],
  impact: ImpactLevel,
): string {
  const trimmed = content.trim().replace(/\s+/g, " ");
  const lead =
    categories.includes("Leadership")
      ? "Led"
      : categories.includes("Cross-Functional Support")
        ? "Supported"
        : categories.includes("Continuous Improvement")
          ? "Drove"
          : categories.includes("Problem Solving")
            ? "Resolved"
            : categories.includes("Knowledge Sharing")
              ? "Shared"
              : "Completed";

  const deptClause = departments.length > 0 ? ` in coordination with ${departments.join(", ")}` : "";
  const impactClause =
    impact === "High"
      ? ", helping prevent delays and protect operational priorities"
      : impact === "Medium"
        ? ", supporting team and department efficiency"
        : "";

  const body = trimmed.replace(/[.!;,\s]+$/, "");
  // Entries usually already start with what was done ("Inspected 6 lots",
  // "Found 3 discrepancies") - prefixing another verb would read "Completed
  // inspected 6 lots", so keep the user's own verb when there is one.
  const firstWord = body.split(" ")[0]?.toLowerCase() ?? "";
  const startsWithVerb = /^[a-z]+ed$/.test(firstWord) || PAST_TENSE_VERBS.has(firstWord);
  const sentence = startsWithVerb ? `${body.charAt(0).toUpperCase()}${body.slice(1)}` : `${lead} ${lowerFirst(body)}`;
  return `${sentence}${deptClause}${impactClause}.`;
}

const PAST_TENSE_VERBS = new Set([
  "did", "found", "made", "built", "led", "ran", "wrote", "taught", "caught", "set", "put",
  "took", "gave", "got", "held", "kept", "met", "sent", "spent", "brought", "thought", "won",
  "drove", "saw", "began", "chose", "fought", "shut", "cut", "read", "rode", "stood", "told",
]);

function lowerFirst(text: string): string {
  if (!text) return text;
  // Leave acronyms alone: "SIR on..." must not become "sIR on...".
  if (/^[A-Z]{2,}/.test(text)) return text;
  return text.charAt(0).toLowerCase() + text.slice(1);
}

// goalMetrics: the goals in force for the entry's year (getGoalSet in
// goalStore.ts); defaults to the built-in set so the engine stays usable
// without a database (tests, scripts).
export function classifyEntry(
  content: string,
  goalMetrics: GoalMetricDefinition[] = DEFAULT_GOAL_SET.metrics,
): ClassificationResult {
  const normalized = normalize(content);
  const { categories, score } = scoreCategories(normalized);
  const departments = detectDepartments(normalized);
  const goalKeys = detectGoalKeys(normalized, goalMetrics);
  const impact = impactLevel(normalized, categories, score);

  const counts = categories.length > 0;
  const finalCategories: Category[] = counts ? categories : ["Routine Work"];

  if (counts && impact === "High" && (categories.includes("Leadership") || categories.includes("Cross-Functional Support"))) {
    finalCategories.push("Promotion Evidence");
  }

  return {
    counts,
    reason: buildReason(categories, departments),
    categories: finalCategories,
    departments,
    impactLevel: impact,
    goalKeys,
    professionalSummary: counts
      ? buildProfessionalSummary(content, categories, departments, impact)
      : content.trim(),
  };
}

// ---------------------------------------------------------------------------
// "Did This Count?" - same engine, framed as a direct answer to that
// question rather than a background classification.
// ---------------------------------------------------------------------------
export function evaluateDidThisCount(
  activity: string,
  goalMetrics: GoalMetricDefinition[] = DEFAULT_GOAL_SET.metrics,
): DidThisCountResult {
  const classification = classifyEntry(activity, goalMetrics);

  const businessImpact = classification.counts
    ? classification.reason
    : "No clear business impact captured yet - this reads as routine task completion. Add more detail (who it helped, what it prevented, what changed) if there's more to it.";

  const goalAlignment =
    classification.goalKeys.length > 0
      ? `Aligns with your annual goal: ${classification.goalKeys
          .map((k) => goalMetricLabel(k, goalMetrics))
          .join(", ")}.`
      : classification.categories.includes("Cross-Functional Support")
        ? "Supports cross-functional work under your annual goal."
        : "No direct annual goal metric matched, but it may still be worth logging as general contribution.";

  const promotionValue =
    classification.impactLevel === "High"
      ? "Strong promotion evidence - shows judgment, ownership, or cross-team impact beyond the base job description."
      : classification.impactLevel === "Medium"
        ? "Moderate promotion value - useful supporting detail in a review, best combined with similar examples."
        : "Low standalone promotion value - fine to log, but look for the bigger pattern across a week or month.";

  return {
    counts: classification.counts,
    businessImpact,
    goalAlignment,
    promotionValue,
    recommendedLanguage: classification.counts
      ? classification.professionalSummary
      : `Handled ${activity.trim().toLowerCase()} as part of routine responsibilities.`,
  };
}
