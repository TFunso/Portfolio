import { describe, expect, it } from "vitest";
import { defaultPeriod, previousPeriod, resolvePeriod, toDateInput } from "../src/lib/periods";

const day = (d: Date) => toDateInput(d);

describe("resolvePeriod", () => {
  it("lines mid-year and year-end up with the May and January reviews", () => {
    const mid = resolvePeriod("mid-year", 2026);
    expect([day(mid.start), day(mid.end)]).toEqual(["2026-01-01", "2026-05-31"]);
    expect(mid.reviewNote).toContain("May 2026 review");

    const ye = resolvePeriod("year-end", 2026);
    expect([day(ye.start), day(ye.end)]).toEqual(["2026-01-01", "2026-12-31"]);
    expect(ye.reviewNote).toContain("January 2027 review");
  });

  it("builds calendar quarters", () => {
    const q2 = resolvePeriod("q2", 2026);
    expect([day(q2.start), day(q2.end)]).toEqual(["2026-04-01", "2026-06-30"]);
    const q4 = resolvePeriod("q4", 2026);
    expect([day(q4.start), day(q4.end)]).toEqual(["2026-10-01", "2026-12-31"]);
  });

  it("accepts custom ranges in either order", () => {
    const c = resolvePeriod("custom", 2026, "2026-04-30", "2026-02-01");
    expect([day(c.start), day(c.end)]).toEqual(["2026-02-01", "2026-04-30"]);
  });
});

describe("previousPeriod", () => {
  it("compares like with like", () => {
    expect(previousPeriod(resolvePeriod("mid-year", 2026)).label).toBe("Mid-Year 2025");
    expect(previousPeriod(resolvePeriod("year-end", 2026)).label).toBe("Year-End 2025");
    expect(previousPeriod(resolvePeriod("q1", 2026)).label).toBe("Q4 2025");
    expect(previousPeriod(resolvePeriod("q3", 2026)).label).toBe("Q2 2026");
  });

  it("uses the equal-length window just before a custom range", () => {
    const prev = previousPeriod(resolvePeriod("custom", 2026, "2026-03-01", "2026-03-10"));
    expect([day(prev.start), day(prev.end)]).toEqual(["2026-02-19", "2026-02-28"]);
  });
});

describe("defaultPeriod", () => {
  it("follows the review calendar", () => {
    expect(defaultPeriod(new Date(2027, 0, 15))).toEqual({ kind: "year-end", year: 2026 });
    expect(defaultPeriod(new Date(2026, 3, 10))).toEqual({ kind: "mid-year", year: 2026 });
    expect(defaultPeriod(new Date(2026, 4, 20))).toEqual({ kind: "mid-year", year: 2026 });
    expect(defaultPeriod(new Date(2026, 8, 1))).toEqual({ kind: "year-end", year: 2026 });
  });
});
