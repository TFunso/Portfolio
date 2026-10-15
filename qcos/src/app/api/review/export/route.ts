import { NextRequest, NextResponse } from "next/server";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import { getYearInReview, SECTION_LABELS, type YearInReview } from "@/lib/review";
import { heading, bullet, numbered } from "@/lib/docxHelpers";

export const dynamic = "force-dynamic";

function buildDocument(data: YearInReview): Document {
  const children: Paragraph[] = [
    new Paragraph({
      text: `${data.year} Self Assessment - ${data.goal.name}`,
      heading: HeadingLevel.TITLE,
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `${data.totalEvidenceCount} pieces of evidence logged this year.`, italics: true })],
      spacing: { after: 200 },
    }),
    heading("Goal Achievement Summary"),
    ...data.goalAchievementSummary.map((g) =>
      bullet(
        `${g.label}: ${g.actual}${g.comparator !== "ongoing" ? ` / ${g.comparator === "max" ? `fewer than ${g.target + 1}` : g.target}` : ""} (${g.status === "green" ? "on track" : g.status === "yellow" ? "in progress" : "needs attention"})`,
      ),
    ),
    heading("Top Accomplishments"),
    ...data.topAccomplishments.map((r, i) => numbered(r.suggestedReviewLanguage, i)),
  ];

  for (const [key, records] of Object.entries(data.sections)) {
    if (records.length === 0) continue;
    children.push(heading(SECTION_LABELS[key] ?? key));
    children.push(...records.map((r) => bullet(r.suggestedReviewLanguage)));
  }

  children.push(heading("Promotion Discussion Talking Points"));
  children.push(...data.talkingPoints.promotion.map((p) => bullet(p)));
  children.push(heading("Raise Discussion Talking Points"));
  children.push(...data.talkingPoints.raise.map((p) => bullet(p)));

  return new Document({ sections: [{ children }] });
}

// GET /api/review/export?year=2026 - the same Year-End Review data as
// /api/review, packaged as a downloadable .docx.
export async function GET(req: NextRequest) {
  const year = Number(req.nextUrl.searchParams.get("year") ?? new Date().getFullYear());
  const data = await getYearInReview(year);
  const doc = buildDocument(data);
  const buffer = await Packer.toBuffer(doc);

  return new NextResponse(new Blob([Uint8Array.from(buffer)]), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="QCOS-Year-End-Review-${year}.docx"`,
    },
  });
}
