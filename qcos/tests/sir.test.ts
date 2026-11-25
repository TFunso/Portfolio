import { describe, expect, it } from "vitest";
import { combineSir, isSirRecord, sirSourceNote } from "../src/lib/sir";

const entry = (iso: string, completed: number | null, hours: number | null = null, findings: number | null = null) => ({
  recordDate: new Date(`${iso}T12:00:00`),
  sirsCompleted: completed,
  hoursSpent: hours,
  defectsCaught: findings,
});

describe("combineSir", () => {
  it("uses daily entries when no monthly totals exist", () => {
    const s = combineSir([entry("2026-02-03", 1, 6, 2), entry("2026-02-20", 1, 4.5)], []);
    expect(s).toMatchObject({ completed: 2, hours: 10.5, findings: 2, entries: 2, entriesCounted: 2, monthsEntered: 0 });
  });

  it("a monthly total replaces that month's entries - never added on top", () => {
    const s = combineSir(
      [entry("2026-02-03", 1, 6, 2), entry("2026-03-10", 1, 3)],
      [{ year: 2026, month: 2, completed: 5, hours: 30, findings: 4 }],
    );
    // Feb: monthly total (5, 30h, 4). Mar: the entry (1, 3h, 0).
    expect(s).toMatchObject({ completed: 6, hours: 33, findings: 4, entries: 2, entriesCounted: 1, monthsEntered: 1 });
  });

  it("blank hours / findings in a monthly total fall back to that month's entries", () => {
    const s = combineSir([entry("2026-02-03", 1, 6, 2)], [{ year: 2026, month: 2, completed: 4, hours: null, findings: null }]);
    expect(s).toMatchObject({ completed: 4, hours: 6, findings: 2 });
  });

  it("a month with only a total and no entries still counts", () => {
    const s = combineSir([], [{ year: 2026, month: 1, completed: 3, hours: 12, findings: null }]);
    expect(s).toMatchObject({ completed: 3, hours: 12, findings: 0, entries: 0, monthsEntered: 1 });
  });

  it("an explicit 0 in a monthly total overrides the entries", () => {
    const s = combineSir([entry("2026-02-03", 1, 6, 2)], [{ year: 2026, month: 2, completed: 0, hours: 0, findings: 0 }]);
    expect(s).toMatchObject({ completed: 0, hours: 0, findings: 0 });
  });
});

describe("sirSourceNote", () => {
  it("describes where the figures came from", () => {
    expect(
      sirSourceNote(combineSir([entry("2026-03-10", 1)], [{ year: 2026, month: 2, completed: 5, hours: null, findings: null }])),
    ).toBe("From monthly totals for 1 month and 1 logged entry from other months");
    expect(sirSourceNote(combineSir([entry("2026-03-10", 1), entry("2026-03-11", 1)], []))).toBe("From 2 logged entries");
  });
});

describe("isSirRecord", () => {
  it("recognises SIR evidence by category, count, or wording", () => {
    expect(isSirRecord({ category: "First Article (SIR)", sirsCompleted: null, whatHappened: "x" })).toBe(true);
    expect(isSirRecord({ category: "Other", sirsCompleted: 2, whatHappened: "x" })).toBe(true);
    expect(isSirRecord({ category: "Other", sirsCompleted: null, whatHappened: "Finished the SIR for the new housing" })).toBe(true);
    expect(isSirRecord({ category: "Other", sirsCompleted: null, whatHappened: "Inspected 40 lots" })).toBe(false);
  });
});
