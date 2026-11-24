import { describe, expect, it } from "vitest";
import { DEFAULT_GOAL_SET, goalMetricLabel, makeGoalKey, validateGoalSet, type GoalSet } from "../src/lib/goals";
import { classifyEntry } from "../src/lib/classifier";

const goals2027: GoalSet = {
  name: "ZERO ESCAPES",
  objectives: ["Prevent escapes"],
  metrics: [
    {
      key: "gauge_rr_studies",
      label: "Gauge R&R Studies",
      target: 3,
      comparator: "min",
      description: "",
      keywords: ["gauge r&r", "grr study"],
    },
  ],
};

describe("goal sets", () => {
  it("makes stable, unique ids for new goals", () => {
    expect(makeGoalKey("Gauge R&R Studies", [])).toBe("gauge_r_r_studies");
    expect(makeGoalKey("Gauge R&R Studies", ["gauge_r_r_studies"])).toBe("gauge_r_r_studies_2");
    expect(makeGoalKey("!!!", [])).toBe("goal");
  });

  it("validates a goal set", () => {
    expect(validateGoalSet(DEFAULT_GOAL_SET)).toBeNull();
    expect(validateGoalSet({ ...goals2027, name: " " })).toMatch(/name/);
    expect(validateGoalSet({ ...goals2027, metrics: [] })).toMatch(/at least one/);
    expect(
      validateGoalSet({ ...goals2027, metrics: [goals2027.metrics[0], goals2027.metrics[0]] }),
    ).toMatch(/twice/);
  });

  it("labels goals from the year's own set", () => {
    expect(goalMetricLabel("gauge_rr_studies", goals2027.metrics)).toBe("Gauge R&R Studies");
    expect(goalMetricLabel("no_inspect_candidate", DEFAULT_GOAL_SET.metrics)).toBe("No Inspect Candidates");
  });
});

describe("classifier with a year's goals", () => {
  it("auto-detects goals from that year's keywords", () => {
    expect(classifyEntry("Ran a gauge R&R on the new caliper", goals2027.metrics).goalKeys).toEqual(["gauge_rr_studies"]);
    // the 2026 keyword no longer applies under 2027's goals
    expect(classifyEntry("Flagged a no inspect candidate", goals2027.metrics).goalKeys).toEqual([]);
    expect(classifyEntry("Flagged a no inspect candidate").goalKeys).toEqual(["no_inspect_candidate"]);
  });
});
