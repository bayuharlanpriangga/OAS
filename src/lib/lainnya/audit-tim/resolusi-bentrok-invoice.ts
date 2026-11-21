import type { BentrokNomorItem, Invoice } from "@/types";
import { escapeHtml } from "../../shared/format/escape-html";
import { readCounterList } from "../../shared/legacy-store/baca-counter";
import { readInvoiceList } from "../../shared/legacy-store/baca-invoice";
import { readJurnalEntries } from "../../shared/legacy-store/baca-jurnal";
import { simpanInvoiceState } from "../../shared/legacy-store/simpan-invoice";
import { writeCounterList } from "../../shared/legacy-store/tulis-counter";
import { writeInvoiceList } from "../../shared/legacy-store/tulis-invoice";
import { selesaikanBentrokNomorInvoice } from "../../shared/penomoran/resolusi-bentrok";

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
      `Terdeteksi ${res.bentrok.length} nomor invoice kembar saat offline:<br>${rincian}`
    );
    win.renderInvoiceList?.();
    win.renderInvoiceKPI?.();
  }
  return res.bentrok;
}
