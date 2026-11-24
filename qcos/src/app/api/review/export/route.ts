import { NextRequest, NextResponse } from "next/server";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import { getPeriodReport, SECTION_LABELS, type PeriodReport } from "@/lib/review";
import { parsePeriodParams } from "@/lib/periods";
import { comparison, goalLine, resultLines } from "@/lib/reviewFormat";
import { heading, bullet, numbered } from "@/lib/docxHelpers";
import { formatVolume } from "@/lib/volume";

export const dynamic = "force-dynamic";

function withResult(text: string, result: string): string {
  return result ? `${text} (Result: ${result})` : text;
}

function volumeSection(data: PeriodReport): Paragraph[] {
  if (!data.volume) return [];
  const t = data.volume.totals;
  const prev = data.previousVolume;
  const lines = [
    `${formatVolume(t)}${prev ? ` (${prev.inspected.toLocaleString("en-US")} inspected, ${prev.rejected.toLocaleString("en-US")} rejected in ${data.previousLabel})` : ""}`,
    ...data.volume.months.map(
      (m) => `${m.label}: ${m.inspected.toLocaleString("en-US")} inspected, ${m.accepted.toLocaleString("en-US")} accepted, ${m.rejected.toLocaleString("en-US")} rejected`,
    ),
  ];
  return [heading("Inspection Volume (SAP)"), ...lines.map((l) => bullet(l))];
}

function buildDocument(data: PeriodReport): Document {
  const { current, previous, previousLabel } = data;
  const subtitle = `${data.period.reviewNote ?? ""}${data.period.inProgress ? " (period still in progress - figures to date)" : ""}`;

  const children: Paragraph[] = [
    new Paragraph({
      text: `${data.period.label} Self Assessment - ${data.goal.name}`,
      heading: HeadingLevel.TITLE,
      spacing: { after: 100 },
    }),
    new Paragraph({ children: [new TextRun({ text: subtitle, italics: true })], spacing: { after: 200 } }),
    heading("At a Glance"),
    bullet(`${current.evidence} pieces of evidence${comparison(String(previous.evidence), previous, previousLabel)}`),
    bullet(`${current.highImpact} high-impact wins${comparison(String(previous.highImpact), previous, previousLabel)}`),
    ...resultLines(current, previous, previousLabel).map((l) => bullet(l)),
    ...volumeSection(data),
    heading("Top Wins"),
    ...(data.topWins.length > 0
      ? data.topWins.map((w, i) => numbered(withResult(w.text, w.result), i))
      : [bullet("No evidence logged in this period yet.")]),
    heading(`${data.goal.name} Goal Progress`),
    ...data.goals.map((g) => bullet(goalLine(g))),
  ];

  for (const [key, items] of Object.entries(data.sections)) {
    if (items.length === 0) continue;
    children.push(heading(SECTION_LABELS[key] ?? key));
    children.push(...items.map((i) => bullet(withResult(i.text, i.result))));
  }

  children.push(heading("Promotion Discussion Talking Points"));
  children.push(...data.talkingPoints.promotion.map((p) => bullet(p)));
  children.push(heading("Raise Discussion Talking Points"));
  children.push(...data.talkingPoints.raise.map((p) => bullet(p)));

  return new Document({ sections: [{ children }] });
}

// GET /api/review/export?period=mid-year&year=2026 (same params as
// /api/review) - the same review report packaged as a downloadable .docx.
export async function GET(req: NextRequest) {
  const period = parsePeriodParams(req.nextUrl.searchParams);
  const data = await getPeriodReport(period);
  const buffer = await Packer.toBuffer(buildDocument(data));

  return new NextResponse(new Blob([Uint8Array.from(buffer)]), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="QCOS-Review-${data.period.label.replace(/[^A-Za-z0-9]+/g, "-")}.docx"`,
    },
  });
}
