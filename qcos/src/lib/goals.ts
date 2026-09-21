import type { GoalMetricKey, GoalStatus } from "@/types";

export interface GoalMetricDefinition {
  key: GoalMetricKey;
  label: string;
  target: number;
  comparator: "min" | "max" | "ongoing";
  description: string;
}

// DRIVE EFFICIENCY - the annual goal this whole app exists to build evidence for.
export const ANNUAL_GOAL = {
  name: "DRIVE EFFICIENCY",
  objectives: [
    "Perform priority inspections",
    "Support hot sheet work",
    "Improve department efficiency",
    "Create quality QNs",
    "Learn new inspection techniques",
    "Share knowledge",
    "Identify No Inspect opportunities",
    "Identify Supplier Certification opportunities",
    "Support team efficiency",
    "Provide cross-functional support",
  ],
};

export const GOAL_METRICS: GoalMetricDefinition[] = [
  {
    key: "no_inspect_candidate",
    label: "No Inspect Candidates",
    target: 2,
    comparator: "min",
    description: "Parts/lots identified as candidates to remove from incoming inspection.",
  },
  {
    key: "supplier_cert_candidate",
    label: "Supplier Certification Candidates",
    target: 2,
    comparator: "min",
    description: "Suppliers identified as candidates for certification status.",
  },
  {
    key: "improvement_project",
    label: "Improvement Projects",
    target: 1,
    comparator: "min",
    description: "Process, workflow, or efficiency improvement projects driven or supported.",
  },
  {
    key: "qn_clarification_request",
    label: "QN Clarification Requests",
    target: 2,
    comparator: "max",
    description: "Times a Quality Notification needed clarification after being written.",
  },
  {
    key: "communication_delay",
    label: "Communication Delays",
    target: 2,
    comparator: "max",
    description: "Delays caused by a communication breakdown.",
  },
  {
    key: "knowledge_sharing_event",
    label: "Knowledge Sharing Events",
    target: 0,
    comparator: "ongoing",
    description: "Times you taught, documented, or shared knowledge with the team.",
  },
];

export function goalMetricStatus(
  metric: GoalMetricDefinition,
  actual: number,
): GoalStatus {
  if (metric.comparator === "ongoing") {
    if (actual >= 3) return "green";
    if (actual >= 1) return "yellow";
    return "red";
  }
  if (metric.comparator === "min") {
    if (actual >= metric.target) return "green";
    if (actual >= Math.ceil(metric.target / 2)) return "yellow";
    return "red";
  }
  // "max" - lower is better (e.g. fewer delays).
  if (actual <= metric.target) return "green";
  if (actual <= metric.target + 1) return "yellow";
  return "red";
}

export function goalMetricLabel(key: GoalMetricKey): string {
  return GOAL_METRICS.find((m) => m.key === key)?.label ?? key;
}
