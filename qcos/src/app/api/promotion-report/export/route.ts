import { NextRequest, NextResponse } from "next/server";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import {
  generatePromotionReport,
  getCachedPromotionReport,
  getPromotionStats,
  parseScope,
  type PromotionStats,
} from "@/lib/promotionReport";
import { parsePromotionReportSections } from "@/lib/promotionReportFormat";
import { heading, bullet } from "@/lib/docxHelpers";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function pct(n: number, total: number): string {
  return total > 0 ? `${Math.round((n / total) * 100)}%` : "0%";
}

// The dashboard's headline numbers as text - Word can't render the CSS
// charts, so the export carries the figures and Print/Save PDF carries the
// visuals.
function atAGlance(stats: PromotionStats): Paragraph[] {
  if (stats.evidenceCount === 0) return [];
  const { high, medium, low } = stats.impactTotals;
  const impactSum = high + medium + low;
  const onTrack = stats.goalProgress.filter((g) => g.status === "green").length;
  const lines = [
    `${stats.evidenceCount} pieces of evidence logged`,
    `${high} high-impact wins`,
    `${stats.crossFunctional.length} teams supported cross-functionally`,
    `${onTrack} of ${stats.goalProgress.length} DRIVE EFFICIENCY goals on track (current year)`,
    `Impact mix: ${pct(high, impactSum)} high · ${pct(medium, impactSum)} medium · ${pct(low, impactSum)} low`,
  ];
  if (stats.categoryTotals.length > 0) {
    lines.push(
      `Top strengths: ${stats.categoryTotals
        .slice(0, 3)
        .map((c) => `${c.category} (${c.count})`)
        .join(", ")}`,
    );
  }
  return [heading("At a Glance"), ...lines.map(bullet)];
}

function buildDocument(scopeLbl: string, content: string, stats: PromotionStats): Document {
  const sections = parsePromotionReportSections(content);
  const children: Paragraph[] = [
    new Paragraph({ text: `Promotion Case - ${scopeLbl}`, heading: HeadingLevel.TITLE, spacing: { after: 200 } }),
    ...atAGlance(stats),
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
  const [report, stats] = await Promise.all([
    existing ?? generatePromotionReport(scope),
    getPromotionStats(scope),
  ]);

  const doc = buildDocument(report.scopeLabel, report.content, stats);
  const buffer = await Packer.toBuffer(doc);

  return new NextResponse(new Blob([Uint8Array.from(buffer)]), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="QCOS-Promotion-Case-${report.scopeLabel.replace(/\s+/g, "-")}.docx"`,
    },
  });
}
