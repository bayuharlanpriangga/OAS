export function unwrapErrorMessage(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as { error?: { message?: string }; message?: string };
      if (typeof parsed?.error?.message === "string" && parsed.error.message.trim()) {
        return parsed.error.message.trim();
      }
      if (typeof parsed?.message === "string" && parsed.message.trim()) {
        return parsed.message.trim();
      }
    } catch {
      // Keep raw string if not valid JSON
    }
  }
  return trimmed;
}
