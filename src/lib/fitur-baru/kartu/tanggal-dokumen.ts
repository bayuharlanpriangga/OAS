export function kartuTgl(s: unknown): string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}/.test(s.trim())
    ? s.trim().slice(0, 10)
    : "";
}
