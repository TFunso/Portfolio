import { NextRequest, NextResponse } from "next/server";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import { getManagerPrepData, type ManagerPrepData } from "@/lib/managerPrep";
import { heading, bullet } from "@/lib/docxHelpers";

export const dynamic = "force-dynamic";

function statusWord(status: string): string {
  return status === "green" ? "on track" : status === "yellow" ? "in progress" : "needs attention";
}

function buildDocument(data: ManagerPrepData): Document {
  const children: Paragraph[] = [
    new Paragraph({ text: `1:1 Prep - ${data.periodLabel}`, heading: HeadingLevel.TITLE, spacing: { after: 100 } }),
    new Paragraph({
      children: [
        new TextRun({
          text:
            data.highlights.length > 0
              ? `${data.highlights.length} ${data.highlights.length === 1 ? "highlight" : "highlights"} this period.`
              : "Nothing logged yet this period.",
          italics: true,
        }),
      ],
      spacing: { after: 200 },
    }),
  ];

  if (data.highlights.length > 0) {
    children.push(heading("Highlights"));
    children.push(...data.highlights.map((h) => bullet(`${h.text} (${h.businessImpact})`)));
  }

  if (data.crossFunctional.length > 0) {
    children.push(heading("Cross-Functional Support"));
    children.push(
      ...data.crossFunctional.map((c) => bullet(`${c.department}: ${c.count} ${c.count === 1 ? "instance" : "instances"}`)),
    );
  }

  children.push(heading("Year-to-Date Goal Progress"));
  children.push(
    ...data.goalProgress.map((g) =>
      bullet(
        `${g.label}: ${g.actual}${g.comparator !== "ongoing" ? ` / ${g.comparator === "max" ? `fewer than ${g.target + 1}` : g.target}` : ""} (${statusWord(g.status)})`,
      ),
    ),
  );

  return new Document({ sections: [{ children }] });
}

// GET /api/manager-prep/export?period=month&year=2026&month=10
// GET /api/manager-prep/export?period=quarter&year=2026
// A manager-ready 1:1 prep doc, scoped to a month or quarter rather than
// the whole year - for the full year, use /api/review/export instead.
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const periodType = params.get("period") === "quarter" ? "quarter" : "month";
  const now = new Date();
  const year = Number(params.get("year") ?? now.getFullYear());
  const month = params.get("month") ? Number(params.get("month")) : undefined;

  const data = await getManagerPrepData(periodType, year, month);
  const doc = buildDocument(data);
  const buffer = await Packer.toBuffer(doc);

  return new NextResponse(new Blob([Uint8Array.from(buffer)]), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="QCOS-1-1-Prep-${data.periodLabel.replace(/\s+/g, "-")}.docx"`,
    },
  });
}
