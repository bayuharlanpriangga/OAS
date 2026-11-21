import { MONTHS_ID } from "./constants";

export function fmtDate(d: string | null | undefined): string {
  if (!d) return "-";
  const [y, m, day] = d.split("-");
  const idx = parseInt(m, 10) - 1;
  return `${day} ${MONTHS_ID[idx] ?? ""} ${y}`;
}
