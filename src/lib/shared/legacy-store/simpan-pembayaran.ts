import type { PembayaranJenis } from "@/types";
import { getCloudSync } from "./sinkron-cloud";
import { readBillList } from "./baca-bill";
import { readInvoiceList } from "./baca-invoice";
import { readPembayaranList } from "./baca-pembayaran";

export function simpanPembayaranState(
  jenis: PembayaranJenis = "invoice"
): Promise<boolean> {
  const kindDok = jenis === "bill" ? "bill" : "invoice";
  const sync = getCloudSync();
  if (sync) return sync([kindDok, "pembayaran"]);
  try {
    localStorage.setItem(
      "oas_pembayaran",
      JSON.stringify(readPembayaranList())
    );
    if (kindDok === "bill") {
      localStorage.setItem("oas_bill", JSON.stringify(readBillList()));
    } else {
      localStorage.setItem("oas_invoices", JSON.stringify(readInvoiceList()));
    }
  } catch {
    return Promise.resolve(false);
  }
  return Promise.resolve(true);
}
