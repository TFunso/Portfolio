import { NextRequest, NextResponse } from "next/server";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import { generatePromotionReport, getCachedPromotionReport, parseScope } from "@/lib/promotionReport";
import { parsePromotionReportSections } from "@/lib/promotionReportFormat";
import { heading, bullet } from "@/lib/docxHelpers";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function buildDocument(scopeLbl: string, content: string): Document {
  const sections = parsePromotionReportSections(content);
  const children: Paragraph[] = [
    new Paragraph({ text: `Promotion Case - ${scopeLbl}`, heading: HeadingLevel.TITLE, spacing: { after: 200 } }),
  ];

  for (const section of sections) {
    if (section.heading) children.push(heading(section.heading));
    for (const line of section.lines) {
      children.push(line.bullet ? bullet(line.text) : new Paragraph({ children: [new TextRun(line.text)], spacing: { after: 100 } }));
    }
  }

  return new Document({ sections: [{ children }] });
}

// GET /api/promotion-report/export?scope=all-time | ?scope=year&year=2026
// Exports the cached report as a .docx, generating one first if none
// exists yet for this scope - export always works, even on a first visit.
export async function GET(req: NextRequest) {
  const scope = parseScope(req.nextUrl.searchParams.get("scope"), req.nextUrl.searchParams.get("year"));
  const existing = await getCachedPromotionReport(scope);
  const report = existing ?? (await generatePromotionReport(scope));

  const doc = buildDocument(report.scopeLabel, report.content);
  const buffer = await Packer.toBuffer(doc);

  return new NextResponse(new Blob([Uint8Array.from(buffer)]), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="QCOS-Promotion-Case-${report.scopeLabel.replace(/\s+/g, "-")}.docx"`,
    },
  });
}
