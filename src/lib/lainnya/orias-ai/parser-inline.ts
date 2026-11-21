import { sanitizeSafeHttpUrl } from "./sanitasi-url";
import type { MarkdownInlineToken } from "./types";

export function parseMarkdownInline(text: string): MarkdownInlineToken[] {
  const tokens: MarkdownInlineToken[] = [];
  const pattern =
    /(\*\*[^*\n]+?\*\*|\*[^*\n]+?\*|`[^`\n]+?`|\[[^\]\n]+\]\(https?:\/\/[^\s)]+\))/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: "text", text: text.slice(lastIndex, match.index) });
    }
    const raw = match[0];
    if (raw.startsWith("**") && raw.endsWith("**")) {
      tokens.push({ type: "bold", text: raw.slice(2, -2) });
    } else if (raw.startsWith("*") && raw.endsWith("*")) {
      tokens.push({ type: "italic", text: raw.slice(1, -1) });
    } else if (raw.startsWith("`") && raw.endsWith("`")) {
      tokens.push({ type: "code", text: raw.slice(1, -1) });
    } else if (raw.startsWith("[")) {
      const linkMatch = raw.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
      const safeHref = linkMatch ? sanitizeSafeHttpUrl(linkMatch[2]) : null;
      if (linkMatch && safeHref) {
        tokens.push({ type: "link", text: linkMatch[1], href: safeHref });
      } else {
        tokens.push({ type: "text", text: raw });
      }
    }
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    tokens.push({ type: "text", text: text.slice(lastIndex) });
  }
  return tokens;
}
