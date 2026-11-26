import { readCurrentCompany } from "@/lib/shared/legacy-store";
import {
  callOasGlobal,
  readAkuns,
  setLegacyActiveKartuStock,
  setLegacyKartuStockTab,
  setLegacyKsJustWroteDirectly,
} from "@/lib/shared/legacy-store";
import {
  addKartuStockOnBuyStore,
  deductKartuStockOnSaleStore,
  findKatByIdStore,
  hitungSaldoKat,
} from "@/lib/kalkulator/persediaan/kartu-stock";
import {
  todayIsoLocal,
  type ItemPembelianLine,
  type MetodeBayarBeli,
} from "@/lib/pembelian/pesanan-pembelian";
import type { JurnalEntry, JurnalLine } from "@/types";

export type PesananPenjualanStatus =
  | "dikemas"
  | "menunggu"
  | "selesai"
  | "dibatalkan";

export interface PesananPenjualanRecord {
  id: string;
  nomor: string;
  tanggal: string;
  pelangganId: string;
  pelangganNama: string;
  metodeBayar: MetodeBayarBeli;
  akunBayarKode: string;
  akunBayarNama: string;
  pengirimanId: string;
  pengirimanNama: string;
  noResi: string;
  catatan: string;
  items: ItemPembelianLine[];
  subtotal: number;
  totalDiskon: number;
  totalPajak: number;
  grandTotal: number;
  hppTotal: number;
  bayarSaatPesan: boolean;
  status: PesananPenjualanStatus;
  tanggalDikirim?: string;
  tanggalSelesai?: string;
  createdAt: string;
}

function soStorageKey(): string {
  const cid = readCurrentCompany()?.id || "guest";
  return `oas_pesanan_penjualan_${cid}`;
}

export function readPesananPenjualanList(): PesananPenjualanRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(soStorageKey());
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as PesananPenjualanRecord[]) : [];
  } catch {
    return [];
  }
}

export function writePesananPenjualanList(
  list: PesananPenjualanRecord[]
): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(soStorageKey(), JSON.stringify(list));
  } catch {}
}

export function generateNomorPenjualan(prefix: "SO" | "PJ"): string {
  const year = new Date().getFullYear();
  if (prefix === "SO") {
    const list = readPesananPenjualanList();
    let maxNum = 0;
    const re = new RegExp(`^SO-${year}-(\\d+)$`);
    list.forEach((p) => {
      const m = re.exec(p.nomor);
      if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
    });
    return `SO-${year}-${String(maxNum + 1).padStart(3, "0")}`;
  }
  const auto = callOasGlobal("autoNo", "PJ");
  if (typeof auto === "string" && auto.trim()) return auto.trim();
  return `PJ-${year}-001`;
}

function findAkunKode(preferred: string, keyword: string): string {
  const list = readAkuns();
  if (list.some((a) => a.kode === preferred)) return preferred;
  const match = list.find((a) => a.nama.toLowerCase().includes(keyword));
  return match?.kode || preferred;
}

function summarize(items: readonly ItemPembelianLine[]) {
  const subtotal = items.reduce((s, i) => s + i.subtotal, 0);
  const totalDiskon = items.reduce((s, i) => s + i.diskonTotal, 0);
  const totalPajak = items.reduce((s, i) => s + i.pajakTotal, 0);
  const grandTotal = subtotal + totalPajak;
  return { subtotal, totalDiskon, totalPajak, grandTotal };
}

function validateStokCukup(items: readonly ItemPembelianLine[]): string | null {
  const needByBarang: Record<string, { nama: string; qty: number; satuan: string }> = {};
  items.forEach((l) => {
    if (!needByBarang[l.barangId]) {
      needByBarang[l.barangId] = { nama: l.barangNama, qty: 0, satuan: l.satuan };
    }
    needByBarang[l.barangId].qty += l.qty;
  });
  for (const [barangId, need] of Object.entries(needByBarang)) {
    const found = findKatByIdStore(barangId);
    const saldo = found ? hitungSaldoKat(found.kat) : null;
    if (!saldo || saldo.totalQty < need.qty) {
      return `Stok "${need.nama}" tidak cukup (dibutuhkan ${need.qty} ${need.satuan}, tersedia ${saldo?.totalQty || 0}).`;
    }
  }
  return null;
}

function deductItemsFromWarehouse(
  items: readonly ItemPembelianLine[],
  tanggal: string,
  ketPrefix: string
): number {
  let totalHpp = 0;
  items.forEach((line) => {
    const res = deductKartuStockOnSaleStore(
      line.barangId,
      line.qty,
      tanggal,
      `${ketPrefix} (${line.barangNama})`
    );
    totalHpp += res.hppBatch || 0;
    const found = findKatByIdStore(line.barangId);
    if (found) {
      setLegacyActiveKartuStock(found.card.id, line.barangId);
      setLegacyKartuStockTab(hitungSaldoKat(found.kat).metode || "fifo");
      setLegacyKsJustWroteDirectly(false);
    }
  });
  callOasGlobal("syncKartuStockDataFromKategori");
  callOasGlobal("renderKartuStock");
  callOasGlobal("renderKartuStockSelector");
  callOasGlobal("renderProduk");
  return Math.round(totalHpp);
}

export interface SimpanPenjualanParams {
  nomor: string;
  tanggal: string;
  pelangganId: string;
  pelangganNama: string;
  metodeBayar: MetodeBayarBeli;
  akunBayarKode: string;
  akunBayarNama: string;
  pengirimanId?: string;
  pengirimanNama?: string;
  noResi?: string;
  catatan: string;
  items: ItemPembelianLine[];
}

/**
 * Penjualan Langsung (offline, tanpa pengiriman):
 * Stok langsung keluar gudang & jurnal Penjualan + PPN + HPP langsung tercatat.
 */
export function simpanPenjualanLangsungStore(
  params: SimpanPenjualanParams
): { ok: true; grandTotal: number } | { ok: false; pesan: string } {
  if (!params.items.length) {
    return { ok: false, pesan: "Tambahkan minimal 1 barang terlebih dahulu." };
  }
  const errStok = validateStokCukup(params.items);
  if (errStok) return { ok: false, pesan: errStok };

  const { subtotal, totalPajak, grandTotal } = summarize(params.items);
  const totalHpp = deductItemsFromWarehouse(
    params.items,
    params.tanggal,
    `Penjualan ${params.nomor}`
  );

  const akunPendapatan = findAkunKode("4101", "penjualan barang");
  const akunPpnKeluaran = findAkunKode("2301", "ppn keluaran");
  const akunHpp = findAkunKode("5101", "hpp");
  const akunPersediaan = findAkunKode("1301", "persediaan barang");
  const ket =
    params.catatan.trim() ||
    `Penjualan Langsung ${params.nomor}${params.pelangganNama ? ` (${params.pelangganNama})` : ""}`;

  const lines: JurnalLine[] = [
    {
      akun: params.akunBayarKode || "1101",
      ket:
        params.metodeBayar === "transfer"
          ? `Transfer masuk ${params.akunBayarNama}`
          : params.akunBayarNama || "Kas",
      debit: grandTotal,
      kredit: 0,
    },
    { akun: akunPendapatan, ket, debit: 0, kredit: subtotal },
  ];
  if (totalPajak > 0) {
    const ppnRate =
      params.items.find((i) => i.pajakPersen > 0)?.pajakPersen ||
      Math.round((totalPajak / Math.max(1, subtotal)) * 100);
    lines.push({
      akun: akunPpnKeluaran,
      ket: `PPN Keluaran ${ppnRate}% (${params.nomor})`,
      debit: 0,
      kredit: totalPajak,
    });
  }
  if (totalHpp > 0) {
    lines.push(
      { akun: akunHpp, ket: `HPP (${params.nomor})`, debit: totalHpp, kredit: 0 },
      {
        akun: akunPersediaan,
        ket: `Persediaan keluar (${params.nomor})`,
        debit: 0,
        kredit: totalHpp,
      }
    );
  }

  const entry: JurnalEntry = {
    tanggal: params.tanggal,
    ket,
    jenis: "Penjualan",
    ref: params.nomor,
    kontakId: params.pelangganId,
    lines,
  };
  callOasGlobal("addJurnal", entry);

  if (params.pelangganId) {
    callOasGlobal("updateKontakTotalTrx", params.pelangganId, grandTotal, "penjualan");
  }
  callOasGlobal(
    "auditLog",
    "create",
    "jurnal",
    `Penjualan Langsung ${params.nomor} (${params.pelangganNama || "Umum"}) Rp ${grandTotal.toLocaleString("id-ID")}`,
    { ref: params.nomor }
  );
  callOasGlobal("renderDashboard");
  return { ok: true, grandTotal };
}

/**
 * Buat Pesanan Penjualan -> masuk ke daftar "Dikemas" di halaman Pesanan Penjualan.
 * - Jika Transfer: saldo bank langsung dicatat masuk sebagai Uang Muka Pelanggan (Dr 110x / Cr 2402).
 * - Stok gudang baru keluar saat tombol "Kirim" diklik (status: dikemas -> menunggu).
 */
export function buatPesananPenjualanStore(
  params: SimpanPenjualanParams
): { ok: true; record: PesananPenjualanRecord } | { ok: false; pesan: string } {
  if (!params.items.length) {
    return { ok: false, pesan: "Tambahkan minimal 1 barang terlebih dahulu." };
  }
  const errStok = validateStokCukup(params.items);
  if (errStok) return { ok: false, pesan: errStok };

  const { subtotal, totalDiskon, totalPajak, grandTotal } = summarize(params.items);
  const bayarSaatPesan = params.metodeBayar === "transfer";

  const record: PesananPenjualanRecord = {
    id: "so_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
    nomor: params.nomor,
    tanggal: params.tanggal,
    pelangganId: params.pelangganId,
    pelangganNama: params.pelangganNama,
    metodeBayar: params.metodeBayar,
    akunBayarKode: params.akunBayarKode || "1101",
    akunBayarNama: params.akunBayarNama || "Kas",
    pengirimanId: params.pengirimanId || "",
    pengirimanNama: params.pengirimanNama || "",
    noResi: (params.noResi || "").trim(),
    catatan: params.catatan.trim(),
    items: params.items,
    subtotal,
    totalDiskon,
    totalPajak,
    grandTotal,
    hppTotal: 0,
    bayarSaatPesan,
    status: "dikemas",
    createdAt: new Date().toISOString(),
  };

  if (bayarSaatPesan) {
    const akunUmPelanggan = findAkunKode("2402", "uang muka pelanggan");
    const ket = `Uang Muka Pesanan Penjualan ${record.nomor}${
      record.pelangganNama ? ` (${record.pelangganNama})` : ""
    }`;
    callOasGlobal("addJurnal", {
      tanggal: record.tanggal,
      ket,
      jenis: "Penjualan",
      ref: record.nomor,
      kontakId: record.pelangganId,
      lines: [
        {
          akun: record.akunBayarKode,
          ket: `Transfer masuk ${record.akunBayarNama}`,
          debit: grandTotal,
          kredit: 0,
        },
        { akun: akunUmPelanggan, ket, debit: 0, kredit: grandTotal },
      ],
    });
  }

  writePesananPenjualanList([record, ...readPesananPenjualanList()]);
  callOasGlobal(
    "auditLog",
    "create",
    "penjualan",
    `Buat Pesanan Penjualan ${record.nomor} (${record.pelangganNama || "Umum"}) status Dikemas`
  );
  callOasGlobal("renderPesananJual");
  callOasGlobal("renderDashboard");
  return { ok: true, record };
}

/**
 * Tombol "Kirim" pada daftar Dikemas -> pindah ke daftar "Menunggu" & keluarkan stok dari gudang.
 */
export function kirimPesananPenjualanStore(
  soId: string,
  opts?: { tanggalKirim?: string; noResi?: string }
): { ok: true; record: PesananPenjualanRecord } | { ok: false; pesan: string } {
  const list = readPesananPenjualanList();
  const idx = list.findIndex((p) => p.id === soId);
  if (idx < 0) return { ok: false, pesan: "Pesanan penjualan tidak ditemukan." };
  const so = list[idx];
  if (so.status !== "dikemas") {
    return { ok: false, pesan: "Hanya pesanan berstatus Dikemas yang bisa dikirim." };
  }

  const errStok = validateStokCukup(so.items);
  if (errStok) return { ok: false, pesan: errStok };

  const tglKirim = opts?.tanggalKirim || todayIsoLocal();
  const hppTotal = deductItemsFromWarehouse(
    so.items,
    tglKirim,
    `Pengiriman ${so.nomor}`
  );

  const updated: PesananPenjualanRecord = {
    ...so,
    status: "menunggu",
    hppTotal,
    tanggalDikirim: tglKirim,
    noResi: opts?.noResi !== undefined ? opts.noResi.trim() : so.noResi,
  };
  list[idx] = updated;
  writePesananPenjualanList(list);
  callOasGlobal(
    "auditLog",
    "edit",
    "penjualan",
    `Kirim Pesanan Penjualan ${so.nomor} (${so.pengirimanNama || "Kurir"}) status Menunggu`
  );
  callOasGlobal("renderPesananJual");
  return { ok: true, record: updated };
}

/**
 * Tombol "Diterima" pada daftar Menunggu -> pindah ke daftar "Selesai" & catat pengakuan Penjualan + HPP.
 */
export function terimaPesananPenjualanStore(
  soId: string,
  tanggalTerima = todayIsoLocal()
): { ok: true; record: PesananPenjualanRecord } | { ok: false; pesan: string } {
  const list = readPesananPenjualanList();
  const idx = list.findIndex((p) => p.id === soId);
  if (idx < 0) return { ok: false, pesan: "Pesanan penjualan tidak ditemukan." };
  const so = list[idx];
  if (so.status !== "menunggu") {
    return { ok: false, pesan: "Hanya pesanan berstatus Menunggu yang bisa ditandai Diterima." };
  }

  const akunPendapatan = findAkunKode("4101", "penjualan barang");
  const akunPpnKeluaran = findAkunKode("2301", "ppn keluaran");
  const akunUmPelanggan = findAkunKode("2402", "uang muka pelanggan");
  const akunHpp = findAkunKode("5101", "hpp");
  const akunPersediaan = findAkunKode("1301", "persediaan barang");
  const ket = `Pesanan Penjualan Diterima ${so.nomor}${
    so.pelangganNama ? ` (${so.pelangganNama})` : ""
  }`;

  const lines: JurnalLine[] = [];
  if (so.bayarSaatPesan) {
    lines.push({
      akun: akunUmPelanggan,
      ket: `Pelunasan Uang Muka ${so.nomor}`,
      debit: so.grandTotal,
      kredit: 0,
    });
  } else {
    lines.push({
      akun: so.akunBayarKode || "1101",
      ket: so.akunBayarNama || "Kas",
      debit: so.grandTotal,
      kredit: 0,
    });
  }
  lines.push({ akun: akunPendapatan, ket, debit: 0, kredit: so.subtotal });
  if (so.totalPajak > 0) {
    const ppnRate =
      so.items.find((i) => i.pajakPersen > 0)?.pajakPersen ||
      Math.round((so.totalPajak / Math.max(1, so.subtotal)) * 100);
    lines.push({
      akun: akunPpnKeluaran,
      ket: `PPN Keluaran ${ppnRate}% (${so.nomor})`,
      debit: 0,
      kredit: so.totalPajak,
    });
  }
  if (so.hppTotal > 0) {
    lines.push(
      { akun: akunHpp, ket: `HPP (${so.nomor})`, debit: so.hppTotal, kredit: 0 },
      {
        akun: akunPersediaan,
        ket: `Persediaan keluar (${so.nomor})`,
        debit: 0,
        kredit: so.hppTotal,
      }
    );
  }

  callOasGlobal("addJurnal", {
    tanggal: tanggalTerima,
    ket,
    jenis: "Penjualan",
    ref: so.nomor,
    kontakId: so.pelangganId,
    lines,
  });

  const updated: PesananPenjualanRecord = {
    ...so,
    status: "selesai",
    tanggalSelesai: tanggalTerima,
  };
  list[idx] = updated;
  writePesananPenjualanList(list);

  if (so.pelangganId) {
    callOasGlobal("updateKontakTotalTrx", so.pelangganId, so.grandTotal, "penjualan");
  }
  callOasGlobal(
    "auditLog",
    "edit",
    "penjualan",
    `Pesanan Penjualan ${so.nomor} Diterima (Selesai)`
  );
  callOasGlobal("renderPesananJual");
  callOasGlobal("renderDashboard");
  return { ok: true, record: updated };
}

export function batalkanPesananPenjualanStore(
  soId: string
): { ok: true; record: PesananPenjualanRecord } | { ok: false; pesan: string } {
  const list = readPesananPenjualanList();
  const idx = list.findIndex((p) => p.id === soId);
  if (idx < 0) return { ok: false, pesan: "Pesanan penjualan tidak ditemukan." };
  const so = list[idx];
  if (so.status === "selesai" || so.status === "dibatalkan") {
    return { ok: false, pesan: "Pesanan ini tidak dapat dibatalkan." };
  }

  // Jika sudah terlanjur dikirim (menunggu), kembalikan stok ke gudang
  if (so.status === "menunggu") {
    so.items.forEach((item) => {
      const unitCost =
        so.hppTotal > 0 && so.items.length === 1 && item.qty > 0
          ? so.hppTotal / item.qty
          : item.harga;
      addKartuStockOnBuyStore(
        item.barangId,
        item.qty,
        unitCost,
        todayIsoLocal(),
        `Retur batal ${so.nomor}`
      );
    });
    callOasGlobal("syncKartuStockDataFromKategori");
    callOasGlobal("renderKartuStock");
  }

  if (so.bayarSaatPesan) {
    const akunUmPelanggan = findAkunKode("2402", "uang muka pelanggan");
    callOasGlobal("addJurnal", {
      tanggal: todayIsoLocal(),
      ket: `Pembatalan & Pengembalian Dana ${so.nomor}`,
      jenis: "Penjualan",
      ref: so.nomor,
      kontakId: so.pelangganId,
      lines: [
        { akun: akunUmPelanggan, ket: `Batal ${so.nomor}`, debit: so.grandTotal, kredit: 0 },
        { akun: so.akunBayarKode, ket: `Pengembalian ${so.akunBayarNama}`, debit: 0, kredit: so.grandTotal },
      ],
    });
  }

  const updated: PesananPenjualanRecord = { ...so, status: "dibatalkan" };
  list[idx] = updated;
  writePesananPenjualanList(list);
  callOasGlobal("renderPesananJual");
  callOasGlobal("renderDashboard");
  return { ok: true, record: updated };
}
