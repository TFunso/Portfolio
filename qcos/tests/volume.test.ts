import { describe, expect, it } from "vitest";
import {
  formatVolume,
  parseDateCell,
  parsePastedVolume,
  totalVolume,
  unitsOutsideSapMonths,
  validateMonth,
} from "../src/lib/volume";

describe("parseDateCell", () => {
  it("reads the formats an SAP export usually uses", () => {
    expect(parseDateCell("2026-03-04")).toEqual({ year: 2026, month: 3 });
    expect(parseDateCell("04.03.2026")).toEqual({ year: 2026, month: 3 });
    expect(parseDateCell("03/04/2026", "mdy")).toEqual({ year: 2026, month: 3 });
    expect(parseDateCell("03/04/2026", "dmy")).toEqual({ year: 2026, month: 4 });
    expect(parseDateCell("25/03/2026", "mdy")).toEqual({ year: 2026, month: 3 }); // impossible month settles it
    expect(parseDateCell("03/2026")).toEqual({ year: 2026, month: 3 });
    expect(parseDateCell("Mar 2026")).toEqual({ year: 2026, month: 3 });
    expect(parseDateCell("March-26")).toEqual({ year: 2026, month: 3 });
    expect(parseDateCell("Date")).toBeNull();
    expect(parseDateCell("13/13/2026")).toBeNull();
  });
});

describe("parsePastedVolume", () => {
  it("sums daily accepted/rejected rows into monthly totals", () => {
    const text = [
      "Date\tAccepted\tRejected",
      "01/05/2026\t40\t2",
      "01/06/2026\t38\t0",
      "02/02/2026\t1,200\t15",
      "",
      "Total\t1,278\t17",
    ].join("\n");
    const r = parsePastedVolume(text, "mdy");
    expect(r.months).toEqual([
      { year: 2026, month: 1, inspected: 80, accepted: 78, rejected: 2 },
      { year: 2026, month: 2, inspected: 1215, accepted: 1200, rejected: 15 },
    ]);
    expect(r.rowsUsed).toBe(3);
    expect(r.skipped.map((s) => s.reason)).toEqual(["no date found", "no date found"]);
  });

  it("accepts monthly rows with inspected, accepted, rejected", () => {
    const r = parsePastedVolume("Mar 2026;500;480;12\nApr 2026;450;445;5");
    expect(r.months).toEqual([
      { year: 2026, month: 3, inspected: 500, accepted: 480, rejected: 12 },
      { year: 2026, month: 4, inspected: 450, accepted: 445, rejected: 5 },
    ]);
  });

  it("rejects rows that don't add up or lack counts", () => {
    const r = parsePastedVolume("2026-03-01\t10\t9\t5\n2026-03-02\t7");
    expect(r.months).toEqual([]);
    expect(r.skipped.map((s) => s.reason)).toEqual([
      "accepted + rejected is more than inspected",
      "needs accepted and rejected counts",
    ]);
  });
});

describe("unitsOutsideSapMonths", () => {
  it("drops logged lots only for months SAP already covers", () => {
    const records = [
      { recordDate: new Date(2026, 9, 10), unitsHandled: 6 }, // Oct - SAP covered
      { recordDate: new Date(2026, 10, 3), unitsHandled: 12 }, // Nov - no SAP yet
      { recordDate: new Date(2026, 10, 4), unitsHandled: null },
    ];
    expect(unitsOutsideSapMonths(records, [{ year: 2026, month: 10 }])).toBe(12);
    expect(unitsOutsideSapMonths(records, [])).toBe(18);
  });
});

describe("totals", () => {
  it("totals months and computes the reject rate", () => {
    const t = totalVolume([
      { year: 2026, month: 1, inspected: 1000, accepted: 970, rejected: 30 },
      { year: 2026, month: 2, inspected: 500, accepted: 495, rejected: 5 },
    ]);
    expect(t).toEqual({ inspected: 1500, accepted: 1465, rejected: 35, months: 2, rejectRate: 2.3 });
    expect(formatVolume(t)).toBe("1,500 lots inspected · 1,465 accepted · 35 rejected (2.3%)");
    expect(validateMonth({ inspected: 10, accepted: 8, rejected: 3 })).toMatch(/can't be more/);
    expect(validateMonth({ inspected: 10, accepted: 7, rejected: 2 })).toBeNull();
  });
});
