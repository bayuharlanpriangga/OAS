import { isPlainObject } from "./isPlainObject";
import type { AiAction, ExtractedAiActions } from "./types";

export function extractAiActions(rawText: string): ExtractedAiActions {
  const source = typeof rawText === "string" ? rawText : "";
  const match = source.match(/<ACTIONS>\s*([\s\S]*?)\s*<\/ACTIONS>/i);
  const displayText = source.replace(/<ACTIONS>[\s\S]*?<\/ACTIONS>/gi, "").trim();

  if (!match) {
    return { displayText, actions: [], hadActionBlock: false };
  }

  let jsonPayload = match[1].trim();
  const fenceMatch = jsonPayload.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenceMatch) {
    jsonPayload = fenceMatch[1].trim();
  }

  try {
    const parsed = JSON.parse(jsonPayload);
    if (!Array.isArray(parsed)) {
      return {
        displayText,
        actions: [],
        hadActionBlock: true,
        parseError: "Blok ACTIONS harus berupa array JSON.",
      };
    }
    const actions = parsed.filter(
      (item): item is AiAction =>
        isPlainObject(item) && typeof item.type === "string" && item.type.trim().length > 0
    );
    return { displayText, actions, hadActionBlock: true };
  } catch (err) {
    return {
      displayText,
      actions: [],
      hadActionBlock: true,
      parseError: err instanceof Error ? err.message : "Format JSON ACTIONS tidak valid.",
    };
  }
}
