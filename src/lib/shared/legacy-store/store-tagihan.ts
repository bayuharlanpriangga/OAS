import type { Invoice, Bill, Pembayaran, PembayaranJenis, DokumenTagihan, SusunPembayaranResult, SusunHapusPembayaranResult, DokRecord } from "@/types";
import { getLegacyStore, getCloudSync, readCounterList, writeCounterList } from "./store-inti";
import { nomorBerikut, counterSetelahPakai } from "../penomoran";
import { statusDariPembayaran } from "../../fitur-baru/pembayaran";
import type {
  AnggaranRecord,
  JurnalBerulangHistoryRecord,
  JurnalBerulangRecord,
  KursDataRecord,
  NotifAlertRecord,
  NotifHistoryRecord,
} from "./types";

export function readInvoiceList(): Invoice[] {
  return getLegacyStore()?.getInvoiceList?.() ?? [];
}

export function writeInvoiceList(next: Invoice[]): void {
  getLegacyStore()?.setInvoiceList?.(next);
}

export function simpanInvoiceState(includeCounter = false): Promise<boolean> {
  const sync = getCloudSync();
  if (sync) return sync(includeCounter ? ["invoice", "counter"] : ["invoice"]);
  try {
    localStorage.setItem("oas_invoices", JSON.stringify(readInvoiceList()));
    if (includeCounter) {
      localStorage.setItem("oas_counter", JSON.stringify(readCounterList()));
    }
  } catch {
    return Promise.resolve(false);
  }
  return Promise.resolve(true);
}

export function readBillList(): Bill[] {
  return getLegacyStore()?.getBillList?.() ?? [];
}

export function writeBillList(next: Bill[]): void {
  getLegacyStore()?.setBillList?.(next);
}

export function simpanBillState(): Promise<boolean> {
  const sync = getCloudSync();
  if (sync) return sync(["bill", "counter"]);
  try {
    localStorage.setItem("oas_bill", JSON.stringify(readBillList()));
    localStorage.setItem("oas_counter", JSON.stringify(readCounterList()));
  } catch {
    return Promise.resolve(false);
  }
  return Promise.resolve(true);
}

export function nomorBillBerikutState(tahun?: number): string {
  const y = Number.isInteger(tahun)
    ? (tahun as number)
    : new Date().getFullYear();
  return nomorBerikut(
    "BILL",
    y,
    readBillList().map((b) => b && b.noBill),
    readCounterList()
  );
}

export function tambahBillState(bill: Bill): Promise<boolean> {
  const next = [bill, ...readBillList()];
  writeBillList(next);
  const nextCounter = counterSetelahPakai(readCounterList(), bill.noBill);
  writeCounterList(nextCounter);
  return simpanBillState();
}

export function perbaruiBillState(bill: Bill): boolean {
  if (!bill || typeof bill !== "object") return false;
  const list = readBillList().slice();
  const i = list.findIndex((b) => b && b.id === bill.id);
  if (i < 0) return false;
  list[i] = bill;
  writeBillList(list);
  const nextCounter = counterSetelahPakai(readCounterList(), bill.noBill);
  writeCounterList(nextCounter);
  void simpanBillState();
  return true;
}

export function hapusBillByIdState(id: string): boolean {
  const prev = readBillList();
  const next = prev.filter((b) => b && b.id !== id);
  if (next.length === prev.length) return false;
  writeBillList(next);
  void simpanBillState();
  return true;
}

export function readPembayaranList(): Pembayaran[] {
  return getLegacyStore()?.getPembayaranList?.() ?? [];
}

export function writePembayaranList(next: Pembayaran[]): void {
  getLegacyStore()?.setPembayaranList?.(next);
}

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

export function catatPembayaranState(
  dok: DokumenTagihan,
  hasil: SusunPembayaranResult
): Promise<boolean> {
  if (!dok || !hasil || !hasil.ok) return Promise.resolve(false);
  const nextList = [hasil.pembayaran, ...readPembayaranList()];
  writePembayaranList(nextList);
  if (hasil.dibayarLama > 0) dok.dibayarLama = hasil.dibayarLama;
  dok.sisaTagihan = hasil.sisaBaru;
  dok.status = statusDariPembayaran(
    dok,
    nextList,
    hasil.pembayaran.jenis
  ) as DokumenTagihan["status"];
  return simpanPembayaranState(hasil.pembayaran.jenis);
}

export function terapkanHapusPembayaranState(
  dok: DokumenTagihan | null | undefined,
  hasil: SusunHapusPembayaranResult
): Promise<boolean> {
  if (!hasil || !hasil.ok) return Promise.resolve(false);
  writePembayaranList(hasil.daftarBaru);
  if (dok && !hasil.yatim) {
    if (hasil.dibayarLama > 0) dok.dibayarLama = hasil.dibayarLama;
    dok.sisaTagihan = hasil.sisaBaru;
    if (hasil.statusBaru) {
      dok.status = hasil.statusBaru as DokumenTagihan["status"];
    }
  }
  return simpanPembayaranState(hasil.pembayaran.jenis);
}

export function readDokList(): DokRecord[] {
  return getLegacyStore()?.getDokList?.() ?? [];
}

export function writeDokList(next: DokRecord[]): void {
  getLegacyStore()?.setDokList?.(next);
}

export function simpanDokState(): Promise<boolean> {
  const sync = getCloudSync();
  if (sync) return sync(["dok", "counter"]);
  try {
    localStorage.setItem("oas_dok", JSON.stringify(readDokList()));
    localStorage.setItem("oas_counter", JSON.stringify(readCounterList()));
  } catch {
    return Promise.resolve(false);
  }
  return Promise.resolve(true);
}

export function tambahDokState(dok: DokRecord): Promise<boolean> {
  const next = [dok, ...readDokList()];
  writeDokList(next);
  const nextCounter = counterSetelahPakai(readCounterList(), dok.no);
  writeCounterList(nextCounter);
  return simpanDokState();
}

export function perbaruiDokState(dok: DokRecord): boolean {
  if (!dok || typeof dok !== "object") return false;
  const list = readDokList().slice();
  const i = list.findIndex((d) => d && d.id === dok.id);
  if (i < 0) return false;
  list[i] = dok;
  writeDokList(list);
  void simpanDokState();
  return true;
}

export function hapusDokByIdState(id: string): boolean {
  const prev = readDokList();
  const next = prev.filter((d) => d && d.id !== id);
  if (next.length === prev.length) return false;
  writeDokList(next);
  void simpanDokState();
  return true;
}

export function readAnggaranList(): AnggaranRecord[] {
  return getLegacyStore()?.getAnggaranList?.() ?? [];
}

export function writeAnggaranList(next: AnggaranRecord[]): void {
  getLegacyStore()?.setAnggaranList?.(next);
}

export function readNotifAlerts(): NotifAlertRecord[] {
  return getLegacyStore()?.getNotifAlerts?.() ?? [];
}

export function writeNotifAlerts(next: NotifAlertRecord[]): void {
  getLegacyStore()?.setNotifAlerts?.(next);
}


export function readNotifHistory(): NotifHistoryRecord[] {
  return getLegacyStore()?.getNotifHistory?.() ?? [];
}

export function writeNotifHistory(next: NotifHistoryRecord[]): void {
  getLegacyStore()?.setNotifHistory?.(next);
}

export function readJurnalBerulangList(): JurnalBerulangRecord[] {
  return getLegacyStore()?.getJurnalBerulangList?.() ?? [];
}

export function writeJurnalBerulangList(next: JurnalBerulangRecord[]): void {
  getLegacyStore()?.setJurnalBerulangList?.(next);
}

export function readJurnalBerulangHistory(): JurnalBerulangHistoryRecord[] {
  return getLegacyStore()?.getJurnalBerulangHistory?.() ?? [];
}

export function writeJurnalBerulangHistory(
  next: JurnalBerulangHistoryRecord[]
): void {
  getLegacyStore()?.setJurnalBerulangHistory?.(next);
}

export function readKursData(): KursDataRecord {
  return (
    getLegacyStore()?.getKursData?.() ?? {
      USD: 1,
      IDR: 16200,
      SGD: 12100,
      EUR: 18300,
      MYR: 3500,
      JPY: 107,
      updatedAt: null,
    }
  );
}

export function writeKursData(next: KursDataRecord): void {
  getLegacyStore()?.setKursData?.(next);
}
