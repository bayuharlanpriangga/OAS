export function getWin(): Record<string, unknown> | null {
  if (typeof window === "undefined") return null;
  return window as unknown as Record<string, unknown>;
}
