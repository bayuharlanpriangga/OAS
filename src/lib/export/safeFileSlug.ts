export function safeFileSlug(s: string): string {
  return (s || "OAS")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}
