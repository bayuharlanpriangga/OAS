import type { CounterRecord, BentrokNomorItem, Invoice } from "@/types";
import { readCurrentCompany, writeCounterList, readCounterList, readInvoiceList, readJurnalEntries, simpanInvoiceState, writeInvoiceList } from "../../shared/legacy-store";
import { nomorBerikut, counterSetelahPakai, counterTanpaJenis, selesaikanBentrokNomorInvoice } from "../../shared/penomoran";
import { escapeHtml } from "../../shared/format";

export function syncCounterOnly(next: CounterRecord[]): void {
  writeCounterList(next);
  if (typeof window === "undefined") return;
  const win = window as unknown as {
    cloudSyncRecords?: (kinds: string[]) => Promise<boolean>;
  };
  if (readCurrentCompany() && typeof win.cloudSyncRecords === "function") {
    void win.cloudSyncRecords(["counter"]);
  } else {
    try {
      localStorage.setItem("oas_counter", JSON.stringify(next));
    } catch {}
  }
}

export function nomorInvoiceBerikutState(tahun?: number): string {
  const y = Number.isInteger(tahun)
    ? (tahun as number)
    : new Date().getFullYear();
  return nomorBerikut(
    "INV",
    y,
    readInvoiceList().map((i) => i && i.noInvoice),
    readCounterList()
  );
}

export function catatNomorInvoiceState(nomor: string): boolean {
  const cur = readCounterList();
  const baru = counterSetelahPakai(cur, nomor);
  if (baru === cur) return false;
  syncCounterOnly(baru);
  return true;
}

export function resetCounterJenisState(jenis: string): boolean {
  const cur = readCounterList();
  const baru = counterTanpaJenis(cur, jenis);
  if (baru === cur) return false;
  syncCounterOnly(baru);
  return true;
}

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
