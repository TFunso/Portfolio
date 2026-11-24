import type { GoalMetricKey, GoalStatus } from "@/types";

// ---------------------------------------------------------------------------
// Annual goals. Goals change from year to year, so they are data: one
// GoalSet per year, saved from the Goals page (GoalYear table, see
// goalStore.ts). A year with no saved set carries over the most recent
// earlier year's set; before anything is saved, DEFAULT_GOAL_SET (the 2026
// DRIVE EFFICIENCY goal) applies. Every report judges a year against that
// year's own goals, so editing next year's goals never re-scores the past.
//
// Pure module - safe in client components.
// ---------------------------------------------------------------------------

export interface GoalMetricDefinition {
  key: GoalMetricKey; // stable id - goal events are stored against it
  label: string;
  target: number;
  comparator: "min" | "max" | "ongoing";
  description: string;
  // Phrases that log this goal automatically when they appear in a daily
  // entry (case-insensitive, matched anywhere in the text).
  keywords: string[];
}

export interface GoalSet {
  name: string;
  objectives: string[];
  metrics: GoalMetricDefinition[];
}

export const DEFAULT_GOAL_SET: GoalSet = {
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
  metrics: [
    {
      key: "no_inspect_candidate",
      label: "No Inspect Candidates",
      target: 2,
      comparator: "min",
      description: "Parts/lots identified as candidates to remove from incoming inspection.",
      keywords: ["no inspect", "no-inspect", "remove from inspection"],
    },
    {
      key: "supplier_cert_candidate",
      label: "Supplier Certification Candidates",
      target: 2,
      comparator: "min",
      description: "Suppliers identified as candidates for certification status.",
      keywords: ["supplier cert", "certify supplier", "supplier certification"],
    },
    {
      key: "improvement_project",
      label: "Improvement Projects",
      target: 1,
      comparator: "min",
      description: "Process, workflow, or efficiency improvement projects driven or supported.",
      keywords: ["improvement project", "process improvement", "streamlin", "automat", "optimiz"],
    },
    {
      key: "qn_clarification_request",
      label: "QN Clarification Requests",
      target: 2,
      comparator: "max",
      description: "Times a Quality Notification needed clarification after being written.",
      keywords: ["qn clarification", "clarify the qn", "qn needed clarification"],
    },
    {
      key: "communication_delay",
      label: "Communication Delays",
      target: 2,
      comparator: "max",
      description: "Delays caused by a communication breakdown.",
      keywords: ["communication delay", "miscommunicat", "delayed because"],
    },
    {
      key: "knowledge_sharing_event",
      label: "Knowledge Sharing Events",
      target: 0,
      comparator: "ongoing",
      description: "Times you taught, documented, or shared knowledge with the team.",
      keywords: ["taught", "shared", "showed", "explained", "documented", "trained", "walked through", "demoed"],
    },
  ],
};

// The QN clarification goal also feeds the "QNs right first time" rate.
export const QN_CLARIFICATION_KEY = "qn_clarification_request";

export function goalMetricLabel(key: GoalMetricKey, metrics: GoalMetricDefinition[]): string {
  return metrics.find((m) => m.key === key)?.label ?? key;
}

// A stable id for a new goal, from its label ("Gauge R&R Studies" ->
// "gauge_r_r_studies"), never colliding with an existing key.
export function makeGoalKey(label: string, existing: string[]): string {
  const base =
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 40) || "goal";
  let key = base;
  for (let i = 2; existing.includes(key); i++) key = `${base}_${i}`;
  return key;
}

export function validateGoalSet(set: GoalSet): string | null {
  if (!set.name.trim()) return "Give the annual goal a name.";
  if (set.metrics.length === 0) return "Add at least one measurable target.";
  const keys = new Set<string>();
  for (const m of set.metrics) {
    if (!m.label.trim()) return "Every target needs a name.";
    if (!/^[a-z0-9_]{1,60}$/.test(m.key)) return `"${m.label}" has an invalid id.`;
    if (keys.has(m.key)) return `"${m.label}" appears twice.`;
    keys.add(m.key);
    if (!["min", "max", "ongoing"].includes(m.comparator)) return `"${m.label}" needs a target type.`;
    if (!Number.isInteger(m.target) || m.target < 0) return `"${m.label}" target must be a whole number of 0 or more.`;
  }
  return null;
}

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
