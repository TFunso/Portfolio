import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { listGapChecks, runGapCheck } from "@/lib/gapCheck";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const schema = z.object({
  jobTitle: z.string().trim().min(1, "Add the job title you're going for.").max(200),
  jobDescription: z
    .string()
    .trim()
    .min(80, "Paste the full job description - a few lines isn't enough to find the requirements.")
    .max(20000, "That job description is too long - paste just the responsibilities and requirements sections."),
});

// GET /api/gap-check - recent gap checks, newest first.
export async function GET() {
  const checks = await listGapChecks(10);
  return NextResponse.json({ checks });
}

// POST /api/gap-check { jobTitle, jobDescription } - runs a new check
// against everything currently in the Evidence Vault and saves it.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const check = await runGapCheck(parsed.data.jobTitle, parsed.data.jobDescription);
  return NextResponse.json({ check });
}
