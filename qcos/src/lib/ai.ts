import { CLAUDE_MODEL, REFUSAL_FALLBACK, getAnthropic, responseText } from "@/lib/claude";

// ---------------------------------------------------------------------------
// Optional AI polish pass. The classifier (src/lib/classifier.ts) always
// runs first and is what decides "does this count", categories, impact, and
// goal alignment - deterministic, instant, offline. This module only takes
// that already-decided verdict and asks Claude to turn it into one polished,
// resume-ready sentence, grounded in the facts the classifier already
// extracted (it's told explicitly not to invent anything beyond them).
//
// Only called for entries worth saving as evidence, not on every keystroke -
// fast capture stays fast. If ANTHROPIC_API_KEY isn't set, or the call
// fails, callers fall back to the classifier's own template sentence, so the
// app is fully functional with or without an API key.
// ---------------------------------------------------------------------------

export interface PolishContext {
  reason: string;
  categories: string[];
  impactLevel: string;
  departments?: string[];
}

export async function polishProfessionalSummary(
  rawContent: string,
  context: PolishContext,
  fallback: string,
): Promise<string> {
  const anthropic = getAnthropic();
  if (!anthropic) return fallback;

  try {
    const response = await anthropic.beta.messages.create({
      ...REFUSAL_FALLBACK,
      model: CLAUDE_MODEL,
      max_tokens: 300,
      output_config: { effort: "low" },
      system:
        "You write single-sentence, resume-ready professional accomplishment statements for a Quality Technician's performance review. Rewrite the raw note into one polished, confident sentence using ONLY the facts given - never invent numbers, outcomes, names, or details beyond them. Output ONLY the sentence, no preamble, no quotation marks.",
      messages: [
        {
          role: "user",
          content: [
            `Raw note: "${rawContent.trim()}"`,
            `Categories: ${context.categories.join(", ") || "none"}`,
            `Impact level: ${context.impactLevel}`,
            `Departments supported: ${context.departments?.join(", ") || "none"}`,
            `Why it counts: ${context.reason}`,
          ].join("\n"),
        },
      ],
    });

    const text = responseText(response);
    return text || fallback;
  } catch (error) {
    console.error("AI polish failed, falling back to template summary:", error);
    return fallback;
  }
}
