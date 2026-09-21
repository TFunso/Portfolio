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
  | "Promotion Evidence";

export type Department =
  | "Planning"
  | "Buyers"
  | "Quality Engineers"
  | "Manufacturing Engineers"
  | "Warehouse"
  | "Receiving Inspection Team"
  | "Operations";

export type GoalMetricKey =
  | "no_inspect_candidate"
  | "supplier_cert_candidate"
  | "improvement_project"
  | "qn_clarification_request"
  | "communication_delay"
  | "knowledge_sharing_event";

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
  target: number;
  comparator: "min" | "max" | "ongoing";
  actual: number;
  status: GoalStatus;
}
