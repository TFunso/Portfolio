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

export type PaceStatus = "ahead" | "on-pace" | "behind" | "too-early";

export interface GoalMetricForecast {
  projected: number;
  paceStatus: PaceStatus;
}

const MIN_DAYS_FOR_FORECAST = 14;

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

// A simple linear "at this pace" projection: actual-so-far divided by days
// elapsed this year, extrapolated to a full year. Intentionally rough - it's
// a pace indicator, not a prediction model - so it's suppressed for the
// first couple weeks of the year, where a single early event would
// otherwise project to a wildly overstated year-end number.
export function forecastGoalMetric(
  metric: GoalMetricDefinition,
  actual: number,
  now: Date = new Date(),
): GoalMetricForecast {
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const yearEnd = new Date(now.getFullYear(), 11, 31);
  const daysElapsed = daysBetween(yearStart, now) + 1;
  const daysInYear = daysBetween(yearStart, yearEnd) + 1;

  if (daysElapsed < MIN_DAYS_FOR_FORECAST) {
    return { projected: actual, paceStatus: "too-early" };
  }

  const projected = Math.round((actual / daysElapsed) * daysInYear);

  let paceStatus: PaceStatus;
  if (metric.comparator === "min") {
    if (projected >= metric.target * 1.5) paceStatus = "ahead";
    else if (projected >= metric.target) paceStatus = "on-pace";
    else paceStatus = "behind";
  } else if (metric.comparator === "max") {
    paceStatus = projected <= metric.target ? "on-pace" : "behind";
  } else {
    paceStatus = projected >= 3 ? "on-pace" : "behind";
  }

  return { projected, paceStatus };
}
