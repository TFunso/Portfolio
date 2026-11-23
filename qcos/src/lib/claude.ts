import Anthropic from "@anthropic-ai/sdk";

// ---------------------------------------------------------------------------
// One shared Claude client for every optional AI pass in QCOS (summary
// polish, weekly digest, promotion report, gap check). Returns null when
// ANTHROPIC_API_KEY isn't set - every caller treats that as "use the
// deterministic fallback", per the app's optional-integration convention.
//
// Requests go through the beta endpoint only to opt into server-side
// refusal fallbacks: if the model's safety classifier declines a request,
// the API re-runs it on a fallback model inside the same call instead of
// returning an empty answer.
// ---------------------------------------------------------------------------

export const CLAUDE_MODEL = "claude-opus-5-5";

export const REFUSAL_FALLBACK: Pick<Anthropic.Beta.MessageCreateParams, "betas" | "fallbacks"> = {
  betas: ["server-side-fallback-2026-07-01"],
  fallbacks: "default",
};

let client: Anthropic | null | undefined;

export function getAnthropic(): Anthropic | null {
  if (client !== undefined) return client;
  client = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;
  return client;
}

// The response's text, or "" if the whole fallback chain still refused
// (callers then use their deterministic fallback).
export function responseText(response: Anthropic.Beta.BetaMessage): string {
  if (response.stop_reason === "refusal") return "";
  return response.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
}
