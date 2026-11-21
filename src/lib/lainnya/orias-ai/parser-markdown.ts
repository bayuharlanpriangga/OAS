import type { MarkdownBlock } from "./types";

function cleanFormulaExpr(expr: string): string {
  return expr
    .replace(/\\text\{([^}]*)\}/g, "$1")
    .replace(/\\times/g, "×")
    .replace(/\\div/g, "÷")
    .replace(/\\cdot/g, "·")
    .replace(/\\le/g, "≤")
    .replace(/\\ge/g, "≥")
    .replace(/\\ne/g, "≠")
    .replace(/\\\\/g, " ")
    .trim();
}

export function parseAiResponseMarkdown(rawInput: string): MarkdownBlock[] {
  const text = (rawInput || "").replace(/\r\n/g, "\n").trim();
  if (!text) return [];

  const blocks: MarkdownBlock[] = [];
  const lines = text.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i++;
      continue;
    }

    if (trimmed.startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++;
      blocks.push({ type: "code", text: codeLines.join("\n").trim() });
      continue;
    }

    if (trimmed.startsWith("$$")) {
      if (trimmed.endsWith("$$") && trimmed.length > 4) {
        blocks.push({ type: "formula", text: cleanFormulaExpr(trimmed.slice(2, -2)) });
        i++;
        continue;
      }
      const formulaLines: string[] = [trimmed.slice(2)];
      i++;
      while (i < lines.length && !lines[i].includes("$$")) {
        formulaLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) {
        formulaLines.push(lines[i].replace(/\$\$/g, ""));
        i++;
      }
      blocks.push({ type: "formula", text: cleanFormulaExpr(formulaLines.join(" ")) });
      continue;
    }

    if (
      trimmed.startsWith("|") &&
      i + 1 < lines.length &&
      /^\|?[\s:|-]+\|?$/.test(lines[i + 1].trim())
    ) {
      const parseRow = (rowLine: string) =>
        rowLine
          .trim()
          .replace(/^\|/, "")
          .replace(/\|$/, "")
          .split("|")
          .map((c) => c.trim());
      const headers = parseRow(trimmed);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        rows.push(parseRow(lines[i]));
        i++;
      }
      blocks.push({ type: "table", headers, rows });
      continue;
    }

    if (/^(?:---+|\*\*\*+|___+)\s*$/.test(trimmed)) {
      blocks.push({ type: "hr" });
      i++;
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length as 1 | 2 | 3 | 4;
      blocks.push({ type: "heading", level, text: headingMatch[2].trim() });
      i++;
      continue;
    }

    if (trimmed.startsWith(">")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ""));
        i++;
      }
      blocks.push({ type: "quote", text: quoteLines.join("\n") });
      continue;
    }

    if (/^(?:Dr\.?|Debit|Debet|Kr\.?|Kredit)\s+/i.test(trimmed) && !trimmed.includes("|")) {
      const jLines: Array<{ side: "dr" | "kr"; text: string }> = [];
      while (
        i < lines.length &&
        /^\s*(?:Dr\.?|Debit|Debet|Kr\.?|Kredit)\s+/i.test(lines[i]) &&
        !lines[i].includes("|")
      ) {
        const l = lines[i].trim();
        const isDr = /^(?:Dr\.?|Debit|Debet)\b/i.test(l);
        jLines.push({ side: isDr ? "dr" : "kr", text: l });
        i++;
      }
      blocks.push({ type: "journal", lines: jLines });
      continue;
    }

    if (/^[-•*]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[-•*]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-•*]\s+/, ""));
        i++;
      }
      blocks.push({ type: "list", ordered: false, items });
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ""));
        i++;
      }
      blocks.push({ type: "list", ordered: true, items });
      continue;
    }

    const paraLines: string[] = [trimmed];
    i++;
    while (i < lines.length) {
      const nextTrimmed = lines[i].trim();
      if (
        !nextTrimmed ||
        nextTrimmed.startsWith("```") ||
        nextTrimmed.startsWith("$$") ||
        nextTrimmed.startsWith("#") ||
        nextTrimmed.startsWith(">") ||
        nextTrimmed.startsWith("|") ||
        /^(?:---+|\*\*\*+|___+)\s*$/.test(nextTrimmed) ||
        /^[-•*]\s+/.test(nextTrimmed) ||
        /^\d+\.\s+/.test(nextTrimmed) ||
        /^(?:Dr\.?|Debit|Debet|Kr\.?|Kredit)\s+/i.test(nextTrimmed)
      ) {
        break;
      }
      paraLines.push(nextTrimmed);
      i++;
    }
    blocks.push({ type: "paragraph", text: paraLines.join("\n") });
  }

  return blocks;
}
