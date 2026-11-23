import { describe, expect, it } from "vitest";
import { extractMetrics, formatMetrics, hasMetrics, sumMetrics } from "../src/lib/metrics";

describe("extractMetrics", () => {
  it("takes stated counts of work done", () => {
    expect(extractMetrics("Inspected 6 lots")).toEqual({ unitsHandled: 6 });
    expect(extractMetrics("Caught 2 defects on incoming parts")).toMatchObject({ defectsCaught: 2 });
    expect(extractMetrics("Found three discrepancies on the drawing")).toEqual({ defectsCaught: 3 });
    expect(extractMetrics("Cleared 1,200 parts for the hot sheet")).toEqual({ unitsHandled: 1200 });
  });

  it("only counts hours as saved when a savings word is nearby", () => {
    expect(extractMetrics("Spent 2 hours working hot sheets")).toEqual({});
    expect(extractMetrics("New CMM fixture saved 3 hours per week")).toEqual({ hoursSaved: 3 });
    expect(extractMetrics("Cut inspection time by 30 minutes per lot")).toEqual({ hoursSaved: 0.5 });
    expect(extractMetrics("Setup now takes 1.5 hrs less")).toEqual({ hoursSaved: 1.5 });
  });

  it("picks up avoided delays", () => {
    expect(extractMetrics("Escalated early and avoided a 2-day delay on the build")).toEqual({ delayDaysAvoided: 2 });
    expect(extractMetrics("Prevented 3 days of downtime")).toEqual({ delayDaysAvoided: 3 });
    expect(extractMetrics("Worked 5 days straight")).toEqual({});
  });

  it("only counts dollars in a savings context", () => {
    expect(extractMetrics("Avoided $5k in scrap")).toEqual({ costAvoided: 5000 });
    expect(extractMetrics("Supplier credit of $1,250 recovered")).toEqual({ costAvoided: 1250 });
    expect(extractMetrics("Ordered $2,000 of gauges")).toEqual({});
  });

  it("returns nothing for plain activity", () => {
    expect(extractMetrics("Helped planner locate material")).toEqual({});
  });
});

describe("helpers", () => {
  it("formats, detects and sums", () => {
    const m = { hoursSaved: 3, unitsHandled: 6, costAvoided: 5000 };
    expect(formatMetrics(m)).toBe("3 hours saved · 6 lots/parts · $5,000 saved/avoided");
    expect(hasMetrics({ hoursSaved: null })).toBe(false);
    expect(hasMetrics(m)).toBe(true);
    expect(sumMetrics([m, { hoursSaved: 1.5, defectsCaught: 2 }])).toEqual({
      hoursSaved: 4.5,
      unitsHandled: 6,
      defectsCaught: 2,
      delayDaysAvoided: 0,
      costAvoided: 5000,
    });
  });
});
