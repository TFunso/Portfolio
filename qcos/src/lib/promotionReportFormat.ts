// Pure parsing for the Promotion Report's stored content - no server-only
// imports, so both the client page and the server-side .docx export can
// use the same section splitter without pulling Prisma into the client
// bundle. The report body is plain text with "## Section Name" header
// lines; everything between headers is a sequence of non-empty lines
// (rendered as paragraphs or bullets depending on a leading "- ").

export interface PromotionReportLine {
  text: string;
  bullet: boolean;
}

export interface PromotionReportSection {
  heading: string;
  lines: PromotionReportLine[];
}

export function parsePromotionReportSections(content: string): PromotionReportSection[] {
  const sections: PromotionReportSection[] = [];
  let current: PromotionReportSection | null = null;

  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith("## ")) {
      current = { heading: line.slice(3).trim(), lines: [] };
      sections.push(current);
      continue;
    }

    if (!current) {
      current = { heading: "", lines: [] };
      sections.push(current);
    }
    const bullet = /^[-•]\s+/.test(line);
    current.lines.push({ text: line.replace(/^[-•]\s+/, ""), bullet });
  }

  return sections;
}
