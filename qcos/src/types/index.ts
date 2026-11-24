export type ImpactLevel = "High" | "Medium" | "Low";

export type Category =
  | "Routine Work"
  | "Goal Contribution"
  | "Cross-Functional Support"
  | "Leadership"
  | "Knowledge Sharing"
  | "Technical Expertise"
  | "Continuous Improvement"
  | "Customer Support"
  | "Problem Solving"
  | "First Article (SIR)"
  | "Promotion Evidence";

export type Department =
  | "Planning"
  | "Buyers"
  | "Quality Engineers"
  | "Manufacturing Engineers"
  | "Warehouse"
  | "Receiving Inspection Team"
  | "Operations";

// Ids of the year's goal metrics (see src/lib/goals.ts) - data, not a fixed list.
export type GoalMetricKey = string;

export type GoalStatus = "green" | "yellow" | "red";

export interface ClassificationResult {
  counts: boolean;
  reason: string;
  categories: Category[];
  departments: Department[];
  impactLevel: ImpactLevel;
  goalKeys: GoalMetricKey[];
  professionalSummary: string;
}

export interface DidThisCountResult {
  counts: boolean;
  businessImpact: string;
  goalAlignment: string;
  promotionValue: string;
  recommendedLanguage: string;
}

export interface GoalMetricStatus {
  key: GoalMetricKey;
  label: string;
  description?: string;
  target: number;
  comparator: "min" | "max" | "ongoing";
  actual: number;
  status: GoalStatus;
  projected: number;
  paceStatus: "ahead" | "on-pace" | "behind" | "too-early";
}

export interface DigestSuggestion {
  description: string;
  suggestedGoalKey: GoalMetricKey | null;
  suggestedGoalLabel?: string | null; // goal name when suggested (goal ids vary by year)
  suggestedCategory: Category | null;
}

// Promotion Gap Check - one requirement from the target role's job
// description, judged against the Evidence Vault.
export type GapStatus = "covered" | "thin" | "missing";

export interface GapEvidenceRef {
  id: string;
  date: string; // ISO
  text: string; // the review-ready sentence, snapshotted at check time
}

export interface GapRequirement {
  requirement: string;
  status: GapStatus;
  evidence: GapEvidenceRef[];
  note: string; // why it got this status
  nextStep: string; // what to do/log to strengthen it
}
