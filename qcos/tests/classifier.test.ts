import { describe, expect, it } from "vitest";
import { classifyEntry } from "../src/lib/classifier";

describe("classifyEntry - first article / SIR", () => {
  it("counts SIR, FAI and first article work as evidence", () => {
    for (const text of [
      "Completed SIR for new bracket part",
      "Did FAI on new supplier part, found 2 nonconformances",
      "Worked 6 hours on first article inspection for the new housing",
    ]) {
      const c = classifyEntry(text);
      expect(c.counts).toBe(true);
      expect(c.categories[0]).toBe("First Article (SIR)");
      expect(c.impactLevel).not.toBe("Low");
    }
  });

  it("doesn't match the letters inside ordinary words", () => {
    expect(classifyEntry("I desire a quick lunch").categories).toEqual(["Routine Work"]);
    expect(classifyEntry("Fair amount of rework today").categories).toEqual(["Routine Work"]);
  });

  it("doesn't read 'inspected' as a spec reference", () => {
    expect(classifyEntry("Inspected 6 lots").categories).toEqual(["Goal Contribution"]);
    expect(classifyEntry("Checked the part against the spec").categories).toContain("Technical Expertise");
  });
});

describe("template review sentence", () => {
  it("keeps the user's own verb instead of stacking another one", () => {
    expect(classifyEntry("Completed SIR for the manifold bracket.").professionalSummary).toBe(
      "Completed SIR for the manifold bracket, supporting team and department efficiency.",
    );
    expect(classifyEntry("Found 3 discrepancies on the drawing").professionalSummary.startsWith("Found 3")).toBe(true);
    expect(classifyEntry("SIR on the pump housing").professionalSummary.startsWith("Completed SIR")).toBe(true);
  });
});
