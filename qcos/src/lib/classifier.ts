import type {
  Category,
  ClassificationResult,
  Department,
  DidThisCountResult,
  GoalMetricKey,
  ImpactLevel,
} from "@/types";

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
  weight: number;
}

const CATEGORY_RULES: KeywordRule[] = [
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
      "spec",
      "deviation",
      "measurement",
      "calibration",
      "cmm",
      "blueprint",
      "print interpretation",
    ],
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

const GOAL_METRIC_RULES: { key: GoalMetricKey; keywords: string[] }[] = [
  { key: "no_inspect_candidate", keywords: ["no inspect", "no-inspect", "remove from inspection"] },
  { key: "supplier_cert_candidate", keywords: ["supplier cert", "certify supplier", "supplier certification"] },
  {
    key: "improvement_project",
    keywords: ["improvement project", "process improvement", "streamlin", "automat", "optimiz"],
  },
  { key: "qn_clarification_request", keywords: ["qn clarification", "clarify the qn", "qn needed clarification"] },
  { key: "communication_delay", keywords: ["communication delay", "miscommunicat", "delayed because"] },
  {
    key: "knowledge_sharing_event",
    keywords: ["taught", "shared", "showed", "explained", "documented", "trained", "walked through", "demoed"],
  },
];

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
    const hits = matchKeywords(normalized, rule.keywords);
    if (hits.length > 0) {
      matched.push(rule.category);
      score += hits.length * rule.weight;
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

function detectGoalKeys(normalized: string): GoalMetricKey[] {
  const keys: GoalMetricKey[] = [];
  for (const rule of GOAL_METRIC_RULES) {
    if (matchKeywords(normalized, rule.keywords).length > 0) {
      keys.push(rule.key);
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
  if (categories.includes("Goal Contribution")) parts.push("directly advanced a DRIVE EFFICIENCY objective");
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

  return `${lead} ${lowerFirst(trimmed)}${deptClause}${impactClause}.`;
}

function lowerFirst(text: string): string {
  if (!text) return text;
  return text.charAt(0).toLowerCase() + text.slice(1);
}

export function classifyEntry(content: string): ClassificationResult {
  const normalized = normalize(content);
  const { categories, score } = scoreCategories(normalized);
  const departments = detectDepartments(normalized);
  const goalKeys = detectGoalKeys(normalized);
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
export function evaluateDidThisCount(activity: string): DidThisCountResult {
  const classification = classifyEntry(activity);

  const businessImpact = classification.counts
    ? classification.reason
    : "No clear business impact captured yet - this reads as routine task completion. Add more detail (who it helped, what it prevented, what changed) if there's more to it.";

  const goalAlignment =
    classification.goalKeys.length > 0
      ? `Aligns with DRIVE EFFICIENCY: ${classification.goalKeys
          .map((k) => goalKeyToLabel(k))
          .join(", ")}.`
      : classification.categories.includes("Cross-Functional Support")
        ? "Supports the 'cross-functional support' objective under DRIVE EFFICIENCY."
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

function goalKeyToLabel(key: GoalMetricKey): string {
  const map: Record<GoalMetricKey, string> = {
    no_inspect_candidate: "No Inspect Candidates",
    supplier_cert_candidate: "Supplier Certification Candidates",
    improvement_project: "Improvement Projects",
    qn_clarification_request: "QN Clarification Requests",
    communication_delay: "Communication Delays",
    knowledge_sharing_event: "Knowledge Sharing Events",
  };
  return map[key];
}
