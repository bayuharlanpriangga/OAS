import { readCurrentCompany } from "../../../shared/legacy-store";
import { ksDefaultData } from "./storage";
import { readMksMap } from "./storage";
import { deductKartuStockOnSaleStore } from "./mutasi-stok";
import { addKartuStockOnBuyStore } from "./mutasi-stok";
import { hitungSaldoKat } from "./mutasi-stok";
import { writeMksMap } from "./storage";
import { saveMksStore } from "./storage";
import type { KsKategori, TransferGudangLog } from "./types";

function transferLogKey(): string {
  const cid = readCurrentCompany()?.id || "guest";
  return `oas_transfer_log_${cid}`;
}

export function readTransferLogs(): TransferGudangLog[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(transferLogKey());
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as TransferGudangLog[]) : [];
  } catch {
    return [];
  }
}

export function appendTransferLog(entry: TransferGudangLog): void {
  if (typeof window === "undefined") return;
  try {
    const list = [entry, ...readTransferLogs()].slice(0, 200);
    localStorage.setItem(transferLogKey(), JSON.stringify(list));
  } catch {}
}

/**
 * Cari barang dengan nama yang sama di gudang tujuan; jika belum ada, buat entri barang baru di gudang tsb.
 * Digunakan oleh transaksi Pembelian (untuk menambah barang baru) dan Transfer Antar Gudang.
 */
export function ensureBarangInGudangStore(
  gudangId: string,
  namaBarang: string,
  satuan = "unit",
  rakId?: string
): KsKategori | null {
  const map = readMksMap();
  const gudang = map[gudangId];
  if (!gudang) return null;
  if (!gudang.kategori) gudang.kategori = {};

  const trimmed = namaBarang.trim();
  if (!trimmed) return null;
  const norm = trimmed.toLowerCase();

  const targetRak = rakId || "";
  const existing = Object.values(gudang.kategori).find(
    (k) =>
      k.nama.trim().toLowerCase() === norm &&
      (k.rakId || "") === targetRak
  );
  if (existing) {
    return existing;
  }

  const newId =
    "brg_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6);
  const created: KsKategori = {
    id: newId,
    nama: trimmed,
    satuan: satuan.trim() || gudang.satuan || "unit",
    ...(rakId ? { rakId } : {}),
    deskripsi: "",
    data: ksDefaultData(),
  };
  gudang.kategori[newId] = created;
  writeMksMap(map);
  saveMksStore();
  return created;
}

export interface TransferGudangParams {
  fromGudangId: string;
  barangId: string;
  toGudangId: string;
  toRakId?: string;
  qty: number;
  tanggal: string;
  catatan?: string;
}

export function transferBarangAntarGudangStore(
  params: TransferGudangParams
): { ok: true; log: TransferGudangLog } | { ok: false; pesan: string } {
  const {
    fromGudangId,
    barangId,
    toGudangId,
    toRakId,
    qty,
    tanggal,
    catatan,
  } = params;

  if (!fromGudangId || !toGudangId) {
    return { ok: false, pesan: "Pilih gudang asal dan gudang tujuan." };
  }
  if (fromGudangId === toGudangId) {
    return {
      ok: false,
      pesan: "Gudang tujuan harus berbeda dengan gudang asal.",
    };
  }
  if (!(qty > 0)) {
    return { ok: false, pesan: "Jumlah transfer harus lebih dari 0." };
  }

  const map = readMksMap();
  const fromGudang = map[fromGudangId];
  const toGudang = map[toGudangId];
  if (!fromGudang || !toGudang) {
    return { ok: false, pesan: "Gudang tidak ditemukan." };
  }
  const sourceBarang = fromGudang.kategori?.[barangId];
  if (!sourceBarang) {
    return { ok: false, pesan: "Barang tidak ditemukan di gudang asal." };
  }

  const saldo = hitungSaldoKat(sourceBarang);
  if (qty > saldo.totalQty) {
    return {
      ok: false,
      pesan: `Stok "${sourceBarang.nama}" tidak cukup (tersedia ${saldo.totalQty} ${sourceBarang.satuan || "unit"}).`,
    };
  }

  const ketKeluar = catatan?.trim()
    ? `Transfer ke ${toGudang.nama} (${catatan.trim()})`
    : `Transfer ke ${toGudang.nama}`;
  const out = deductKartuStockOnSaleStore(barangId, qty, tanggal, ketKeluar);
  if (out.qtySell <= 0) {
    return { ok: false, pesan: "Gagal mengurangi stok di gudang asal." };
  }

  const unitCost = out.qtySell > 0 ? out.hppBatch / out.qtySell : 0;
  const destBarang = ensureBarangInGudangStore(
    toGudangId,
    sourceBarang.nama,
    sourceBarang.satuan || "unit",
    toRakId || undefined
  );
  if (!destBarang) {
    return { ok: false, pesan: "Gagal menyiapkan barang di gudang tujuan." };
  }

  const ketMasuk = catatan?.trim()
    ? `Transfer dari ${fromGudang.nama} (${catatan.trim()})`
    : `Transfer dari ${fromGudang.nama}`;
  addKartuStockOnBuyStore(destBarang.id, out.qtySell, unitCost, tanggal, ketMasuk);

  const toRakNama = toRakId
    ? toGudang.rakList?.find((r) => r.id === toRakId)?.nama
    : undefined;

  const log: TransferGudangLog = {
    id: "trf_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
    tanggal,
    fromGudangId,
    fromGudangNama: fromGudang.nama,
    toGudangId,
    toGudangNama: toGudang.nama,
    ...(toRakNama ? { toRakNama } : {}),
    barangNama: sourceBarang.nama,
    satuan: sourceBarang.satuan || "unit",
    qty: out.qtySell,
    nilaiTotal: out.hppBatch,
    ...(catatan?.trim() ? { catatan: catatan.trim() } : {}),
  };
  appendTransferLog(log);

  return { ok: true, log };
}
