import type { Invoice, Pembayaran } from "@/types";

export function bayarKetJurnal(pembayaran: Pembayaran, inv: Invoice): string {
  const no = String(
    (inv && inv.noInvoice) || (pembayaran && pembayaran.noDok) || ""
  ).trim();
  return `Pembayaran ${no} — ${String((inv && inv.pelanggan) || "").trim()}`;
}
