import type { BentrokNomorItem, Invoice } from "@/types";
import { escapeHtml } from "../format/escapeHtml";
import { readCounterList } from "../legacy-store/readCounterList";
import { readInvoiceList } from "../legacy-store/readInvoiceList";
import { readJurnalEntries } from "../legacy-store/readJurnalEntries";
import { simpanInvoiceState } from "../legacy-store/simpanInvoiceState";
import { writeCounterList } from "../legacy-store/writeCounterList";
import { writeInvoiceList } from "../legacy-store/writeInvoiceList";
import { selesaikanBentrokNomorInvoice } from "../penomoran/selesaikanBentrokNomorInvoice";

export async function periksaDanSelesaikanBentrokInvoiceState(): Promise<
  BentrokNomorItem[]
> {
  const invs = readInvoiceList();
  if (!Array.isArray(invs) || invs.length <= 1) return [];
  const res = selesaikanBentrokNomorInvoice<Invoice>(invs, readCounterList());
  if (!res.bentrok.length) return [];

  writeInvoiceList(res.invoices);
  writeCounterList(res.counterList);

  let jurnalBerubah = false;
  const jurnals = readJurnalEntries();
  res.bentrok.forEach((b) => {
    jurnals.forEach((j) => {
      if (!j) return;
      const ketStr = j.ket || j.keterangan || "";
      const matchPel =
        !b.pelanggan || b.pelanggan === "-" || ketStr.includes(b.pelanggan);
      if (matchPel && ketStr.includes(b.noLama)) {
        if (j.ket) j.ket = j.ket.split(b.noLama).join(b.noBaru);
        if (j.keterangan) {
          j.keterangan = j.keterangan.split(b.noLama).join(b.noBaru);
        }
        jurnalBerubah = true;
      }
    });
  });

  await simpanInvoiceState(true);
  if (typeof window !== "undefined") {
    const win = window as unknown as {
      saveToStorage?: (toast?: boolean) => void;
      showAlert?: (msg: string) => void;
      renderInvoiceList?: () => void;
      renderInvoiceKPI?: () => void;
    };
    if (jurnalBerubah) win.saveToStorage?.(false);
    const rincian = res.bentrok
      .map(
        (b) =>
          `Invoice "${escapeHtml(b.pelanggan)}" disesuaikan: <b>${escapeHtml(b.noLama)}</b> ➔ <b>${escapeHtml(b.noBaru)}</b>`
      )
      .join("<br>");
    win.showAlert?.(
      `⚠️ Terdeteksi ${res.bentrok.length} nomor invoice kembar saat offline:<br>${rincian}`
    );
    win.renderInvoiceList?.();
    win.renderInvoiceKPI?.();
  }
  return res.bentrok;
}
