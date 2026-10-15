import { Paragraph, TextRun, HeadingLevel } from "docx";

// Small shared building blocks for the .docx exports (Year-End Review,
// Manager 1:1 Prep) - plain paragraphs rather than docx's native list
// API, which keeps these exports simple and doesn't require configuring
// numbering definitions on the Document.

export function heading(text: string) {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 150 } });
}

export function bullet(text: string) {
  return new Paragraph({ children: [new TextRun(`•  ${text}`)], spacing: { after: 80 } });
}

export function numbered(text: string, index: number) {
  return new Paragraph({ children: [new TextRun(`${index + 1}.  ${text}`)], spacing: { after: 80 } });
}
