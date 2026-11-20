export function agingCsvCell(v: unknown): string {
  const s = String(v === null || v === undefined ? "" : v);
  const safe = /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}
