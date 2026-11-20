import { escapeHtml } from "./escapeHtml";

export function escapeForJsAttr(str: unknown): string {
  if (str === null || str === undefined) return "";
  return escapeHtml(String(str).replace(/\\/g, "\\\\").replace(/'/g, "\\'"));
}
