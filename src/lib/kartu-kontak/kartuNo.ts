import type { KartuDokInput } from "./types";

export function kartuNo(d: KartuDokInput): string {
  return String(d.noInvoice || d.noBill || "").trim() || "-";
}
