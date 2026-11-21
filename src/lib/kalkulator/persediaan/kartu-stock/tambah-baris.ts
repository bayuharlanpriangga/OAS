import { findKatByIdStore } from "./cari-kategori";
import { ksDefaultData } from "./data-awal";
import { rekalkulasiStorage } from "./rekalkulasi";
import { saveMksStore } from "./simpan-storage";
import { nextKsId } from "./state";
import type { KsEntry, KsMetode } from "./types";

export function appendKalkRowsToKatStore(
  katId: string,
  kartuRows: readonly {
    tgl?: string;
    ket?: string;
    mQty?: number | string;
    mHarga?: number | string;
    kQty?: number | string;
  }[],
  metode: KsMetode
): boolean {
  const found = findKatByIdStore(katId);
  if (!found) return false;
  const kat = found.kat;
  if (!kat.data) kat.data = ksDefaultData();
  if (!kat.data[metode]) kat.data[metode] = [];
  const rawNew: KsEntry[] = [];
  (kartuRows || []).forEach((k) => {
    const mQty = k.mQty !== "" && k.mQty !== undefined ? Number(k.mQty) : 0;
    const mHarga =
      k.mHarga !== "" && k.mHarga !== undefined ? Number(k.mHarga) : 0;
    const kQty = k.kQty !== "" && k.kQty !== undefined ? Number(k.kQty) : 0;
    if (mQty > 0) {
      rawNew.push({
        id: nextKsId(),
        tgl: k.tgl || "",
        ket: k.ket || "Pembelian",
        mQty,
        mHarga,
        kQty: 0,
        kHarga: 0,
        kJml: 0,
        saldoLayers: [],
        jurnalDone: false,
      });
    } else if (kQty > 0) {
      rawNew.push({
        id: nextKsId(),
        tgl: k.tgl || "",
        ket: k.ket || "Penjualan",
        mQty: 0,
        mHarga: 0,
        kQty,
        kHarga: 0,
        kJml: 0,
        saldoLayers: [],
        jurnalDone: false,
      });
    }
  });
  kat.data[metode] = rekalkulasiStorage(
    [...kat.data[metode], ...rawNew],
    metode
  );
  saveMksStore();
  return true;
}
