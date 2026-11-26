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
  findKatByIdStore,
  hitungSaldoKat,
} from "@/lib/kalkulator/persediaan/kartu-stock";
import type { Akun, JurnalEntry, JurnalLine } from "@/types";

export type MetodeBayarBeli = "kas" | "transfer";
export type PesananPembelianStatus = "menunggu" | "diterima" | "dibatalkan";

export interface ItemPembelianLine {
  id: string;
  gudangId: string;
  gudangNama: string;
  rakId: string;
  rakNama: string;
  barangId: string;
  barangNama: string;
  satuan: string;
  qty: number;
  harga: number;
  diskonTipe: "persen" | "nominal";
  diskonNilai: number;
  diskonTotal: number;
  pajakPersen: number;
  pajakTotal: number;
  subtotal: number; // qty * harga - diskonTotal
  total: number; // subtotal + pajakTotal
}

export interface PesananPembelianRecord {
  id: string;
  nomor: string;
  tanggal: string;
  pemasokId: string;
  pemasokNama: string;
  metodeBayar: MetodeBayarBeli;
  akunBayarKode: string;
  akunBayarNama: string;
  catatan: string;
  items: ItemPembelianLine[];
  subtotal: number;
  totalDiskon: number;
  totalPajak: number;
  grandTotal: number;
  status: PesananPembelianStatus;
  bayarSaatPesan: boolean;
  tanggalDiterima?: string;
  createdAt: string;
}

export function todayIsoLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function hitungItemPembelian(input: {
  qty: number;
  harga: number;
  diskonTipe: "persen" | "nominal";
  diskonNilai: number;
  pajakPersen: number;
}): {
  bruto: number;
  diskonTotal: number;
  subtotal: number;
  pajakTotal: number;
  total: number;
} {
  const qty = Math.max(0, input.qty || 0);
  const harga = Math.max(0, input.harga || 0);
  const bruto = qty * harga;
  const rawDiskon =
    input.diskonTipe === "persen"
      ? (bruto * Math.max(0, Math.min(100, input.diskonNilai || 0))) / 100
      : Math.max(0, input.diskonNilai || 0);
  const diskonTotal = Math.min(bruto, Math.round(rawDiskon));
  const subtotal = Math.max(0, bruto - diskonTotal);
  const pajakPersen = Math.max(0, input.pajakPersen || 0);
  const pajakTotal = Math.round((subtotal * pajakPersen) / 100);
  const total = subtotal + pajakTotal;
  return { bruto, diskonTotal, subtotal, pajakTotal, total };
}

function poStorageKey(): string {
  const cid = readCurrentCompany()?.id || "guest";
  return `oas_pesanan_pembelian_${cid}`;
}

export function readPesananPembelianList(): PesananPembelianRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(poStorageKey());
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as PesananPembelianRecord[]) : [];
  } catch {
    return [];
  }
}

export function writePesananPembelianList(
  list: PesananPembelianRecord[]
): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(poStorageKey(), JSON.stringify(list));
  } catch {}
}

export function generateNomorPembelian(prefix: "PO" | "PB" | "PJ"): string {
  const year = new Date().getFullYear();
  if (prefix === "PO") {
    const list = readPesananPembelianList();
    let maxNum = 0;
    const re = new RegExp(`^PO-${year}-(\\d+)$`);
    list.forEach((p) => {
      const m = re.exec(p.nomor);
      if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
    });
    return `PO-${year}-${String(maxNum + 1).padStart(3, "0")}`;
  }
  const auto = callOasGlobal("autoNo", prefix);
  if (typeof auto === "string" && auto.trim()) return auto.trim();
  return `${prefix}-${year}-001`;
}

/**
 * Daftar akun Bank dari Chart of Accounts grup 1100 (1102 Bank BCA, 1103 Bank Mandiri, dst.)
 */
export function readAkunBank1100(akunsInput?: readonly Akun[]): Akun[] {
  const list = akunsInput ? [...akunsInput] : readAkuns();
  const banks = list.filter((a) => {
    const kode = String(a.kode || "").trim();
    const nama = String(a.nama || "").toLowerCase();
    if (!kode.startsWith("11")) return false;
    if (kode === "1101" || kode === "1104") return false;
    if (nama.includes("kas kecil") || nama === "kas") return false;
    return true;
  });
  if (banks.length > 0) return banks;
  // Fallback: semua akun 11xx selain 1101
  return list.filter((a) => {
    const kode = String(a.kode || "").trim();
    return kode.startsWith("11") && kode !== "1101";
  });
}

/**
 * Daftar akun Kas dari Chart of Accounts grup 1100 (default 1101 Kas)
 */
export function readAkunKas1100(akunsInput?: readonly Akun[]): Akun[] {
  const list = akunsInput ? [...akunsInput] : readAkuns();
  const kas = list.filter((a) => {
    const kode = String(a.kode || "").trim();
    const nama = String(a.nama || "").toLowerCase();
    return kode === "1101" || kode === "1104" || (kode.startsWith("11") && nama.includes("kas"));
  });
  return kas.length > 0
    ? kas
    : [{ kode: "1101", nama: "Kas", tipe: "Aset", kat: "Lancar", normal: "D" }];
}

function findAkunKode(preferred: string, keyword: string): string {
  const list = readAkuns();
  if (list.some((a) => a.kode === preferred)) return preferred;
  const match = list.find((a) => a.nama.toLowerCase().includes(keyword));
  return match?.kode || preferred;
}

function applyItemsToWarehouseStock(
  items: readonly ItemPembelianLine[],
  tanggal: string,
  ketPrefix: string
): void {
  items.forEach((item) => {
    const netUnitPrice = item.qty > 0 ? item.subtotal / item.qty : item.harga;
    const found = findKatByIdStore(item.barangId);
    if (found) {
      setLegacyActiveKartuStock(found.card.id, item.barangId);
      addKartuStockOnBuyStore(
        item.barangId,
        item.qty,
        netUnitPrice,
        tanggal,
        `${ketPrefix} (${item.barangNama})`
      );
      setLegacyKartuStockTab(hitungSaldoKat(found.kat).metode || "fifo");
      setLegacyKsJustWroteDirectly(false);
    }
  });
  callOasGlobal("syncKartuStockDataFromKategori");
  callOasGlobal("renderKartuStock");
  callOasGlobal("renderKartuStockSelector");
  callOasGlobal("renderProduk");
}

export interface SimpanPembelianParams {
  nomor: string;
  tanggal: string;
  pemasokId: string;
  pemasokNama: string;
  metodeBayar: MetodeBayarBeli;
  akunBayarKode: string;
  akunBayarNama: string;
  catatan: string;
  items: ItemPembelianLine[];
}

function summarizeItems(items: readonly ItemPembelianLine[]) {
  const subtotal = items.reduce((s, i) => s + i.subtotal, 0);
  const totalDiskon = items.reduce((s, i) => s + i.diskonTotal, 0);
  const totalPajak = items.reduce((s, i) => s + i.pajakTotal, 0);
  const grandTotal = subtotal + totalPajak;
  return { subtotal, totalDiskon, totalPajak, grandTotal };
}

/**
 * Pembelian Langsung: stok langsung masuk gudang & saldo Kas/Bank langsung terpotong.
 */
export function simpanPembelianLangsungStore(
  params: SimpanPembelianParams
): { ok: true; grandTotal: number } | { ok: false; pesan: string } {
  if (!params.items.length) {
    return { ok: false, pesan: "Tambahkan minimal 1 barang terlebih dahulu." };
  }
  const { subtotal, totalPajak, grandTotal } = summarizeItems(params.items);
  const akunPersediaan = findAkunKode("1301", "persediaan barang");
  const akunPpnMasukan = findAkunKode("1502", "ppn masukan");
  const ketBase =
    params.catatan.trim() ||
    `Pembelian Langsung ${params.nomor}${params.pemasokNama ? ` (${params.pemasokNama})` : ""}`;

  const lines: JurnalLine[] = [
    { akun: akunPersediaan, ket: ketBase, debit: subtotal, kredit: 0 },
  ];
  if (totalPajak > 0) {
    const ppnRate =
      params.items.find((i) => i.pajakPersen > 0)?.pajakPersen ||
      Math.round((totalPajak / Math.max(1, subtotal)) * 100);
    lines.push({
      akun: akunPpnMasukan,
      ket: `PPN Masukan ${ppnRate}% (${params.nomor})`,
      debit: totalPajak,
      kredit: 0,
    });
  }
  lines.push({
    akun: params.akunBayarKode,
    ket:
      params.metodeBayar === "transfer"
        ? `Transfer ${params.akunBayarNama}`
        : params.akunBayarNama || "Kas",
    debit: 0,
    kredit: grandTotal,
  });

  const entry: JurnalEntry = {
    tanggal: params.tanggal,
    ket: ketBase,
    jenis: "Pembelian",
    ref: params.nomor,
    kontakId: params.pemasokId,
    lines,
  };
  callOasGlobal("addJurnal", entry);

  applyItemsToWarehouseStock(params.items, params.tanggal, `Pembelian ${params.nomor}`);

  if (params.pemasokId) {
    callOasGlobal("updateKontakTotalTrx", params.pemasokId, grandTotal, "pembelian");
  }
  callOasGlobal(
    "auditLog",
    "create",
    "jurnal",
    `Pembelian Langsung ${params.nomor} (${params.pemasokNama || "Umum"}) Rp ${grandTotal.toLocaleString("id-ID")}`,
    { ref: params.nomor }
  );
  callOasGlobal("renderDashboard");
  return { ok: true, grandTotal };
}

/**
 * Buat Pesanan Pembelian (PO):
 * - Barang BELUM masuk gudang (menunggu tombol "Terima Pesanan" di halaman Pesanan Pembelian).
 * - Jika metodeBayar === "transfer": saldo bank langsung terpotong saat PO dibuat (Dr 1501 Uang Muka Pembelian / Cr 110x Bank).
 * - Jika metodeBayar === "kas": belum memotong saldo kas; baru memotong Kas saat Terima Pesanan.
 */
export function buatPesananPembelianStore(
  params: SimpanPembelianParams
): { ok: true; record: PesananPembelianRecord } | { ok: false; pesan: string } {
  if (!params.items.length) {
    return { ok: false, pesan: "Tambahkan minimal 1 barang terlebih dahulu." };
  }
  const { subtotal, totalDiskon, totalPajak, grandTotal } = summarizeItems(
    params.items
  );
  const bayarSaatPesan = params.metodeBayar === "transfer";

  const record: PesananPembelianRecord = {
    id: "po_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
    nomor: params.nomor,
    tanggal: params.tanggal,
    pemasokId: params.pemasokId,
    pemasokNama: params.pemasokNama,
    metodeBayar: params.metodeBayar,
    akunBayarKode: params.akunBayarKode,
    akunBayarNama: params.akunBayarNama,
    catatan: params.catatan.trim(),
    items: params.items,
    subtotal,
    totalDiskon,
    totalPajak,
    grandTotal,
    status: "menunggu",
    bayarSaatPesan,
    createdAt: new Date().toISOString(),
  };

  if (bayarSaatPesan) {
    const akunUangMuka = findAkunKode("1501", "uang muka pembelian");
    const ket = `Uang Muka Pesanan Pembelian ${record.nomor}${
      record.pemasokNama ? ` (${record.pemasokNama})` : ""
    }`;
    const entry: JurnalEntry = {
      tanggal: record.tanggal,
      ket,
      jenis: "Pembelian",
      ref: record.nomor,
      kontakId: record.pemasokId,
      lines: [
        { akun: akunUangMuka, ket, debit: grandTotal, kredit: 0 },
        {
          akun: record.akunBayarKode,
          ket: `Transfer ${record.akunBayarNama}`,
          debit: 0,
          kredit: grandTotal,
        },
      ],
    };
    callOasGlobal("addJurnal", entry);
  }

  const list = [record, ...readPesananPembelianList()];
  writePesananPembelianList(list);
  callOasGlobal(
    "auditLog",
    "create",
    "pembelian",
    `Buat Pesanan Pembelian ${record.nomor} (${record.pemasokNama || "Umum"}) ${
      bayarSaatPesan ? `Transfer ${record.akunBayarNama} terpotong` : "Bayar Kas saat terima"
    }`
  );
  callOasGlobal("renderPesananPembelianPage");
  callOasGlobal("renderDashboard");
  return { ok: true, record };
}

/**
 * Terima Pesanan Pembelian:
 * - Barang masuk ke gudang sesuai rak & kuantitas masing-masing.
 * - Jika Cash (bayarSaatPesan = false): Dr 1301 Persediaan (+ Dr 1502 PPN) / Cr 1101 Kas (potong saldo kas sekarang).
 * - Jika Transfer (bayarSaatPesan = true): Dr 1301 Persediaan (+ Dr 1502 PPN) / Cr 1501 Uang Muka Pembelian (saldo bank sudah terpotong saat pesan).
 */
export function terimaPesananPembelianStore(
  poId: string,
  tanggalTerima = todayIsoLocal()
): { ok: true; record: PesananPembelianRecord } | { ok: false; pesan: string } {
  const list = readPesananPembelianList();
  const idx = list.findIndex((p) => p.id === poId);
  if (idx < 0) return { ok: false, pesan: "Pesanan pembelian tidak ditemukan." };
  const po = list[idx];
  if (po.status !== "menunggu") {
    return { ok: false, pesan: "Pesanan pembelian ini sudah diproses." };
  }

  const akunPersediaan = findAkunKode("1301", "persediaan barang");
  const akunPpnMasukan = findAkunKode("1502", "ppn masukan");
  const akunUangMuka = findAkunKode("1501", "uang muka pembelian");
  const ket = `Penerimaan Pesanan ${po.nomor}${
    po.pemasokNama ? ` (${po.pemasokNama})` : ""
  }`;

  const lines: JurnalLine[] = [
    { akun: akunPersediaan, ket, debit: po.subtotal, kredit: 0 },
  ];
  if (po.totalPajak > 0) {
    const ppnRate =
      po.items.find((i) => i.pajakPersen > 0)?.pajakPersen ||
      Math.round((po.totalPajak / Math.max(1, po.subtotal)) * 100);
    lines.push({
      akun: akunPpnMasukan,
      ket: `PPN Masukan ${ppnRate}% (${po.nomor})`,
      debit: po.totalPajak,
      kredit: 0,
    });
  }
  if (po.bayarSaatPesan) {
    lines.push({
      akun: akunUangMuka,
      ket: `Pelunasan Uang Muka ${po.nomor} (Transfer saat pesan)`,
      debit: 0,
      kredit: po.grandTotal,
    });
  } else {
    lines.push({
      akun: po.akunBayarKode || "1101",
      ket: po.akunBayarNama || "Kas",
      debit: 0,
      kredit: po.grandTotal,
    });
  }

  const entry: JurnalEntry = {
    tanggal: tanggalTerima,
    ket,
    jenis: "Pembelian",
    ref: po.nomor,
    kontakId: po.pemasokId,
    lines,
  };
  callOasGlobal("addJurnal", entry);

  applyItemsToWarehouseStock(po.items, tanggalTerima, `Terima PO ${po.nomor}`);

  const updated: PesananPembelianRecord = {
    ...po,
    status: "diterima",
    tanggalDiterima: tanggalTerima,
  };
  list[idx] = updated;
  writePesananPembelianList(list);

  if (po.pemasokId) {
    callOasGlobal("updateKontakTotalTrx", po.pemasokId, po.grandTotal, "pembelian");
  }
  callOasGlobal(
    "auditLog",
    "edit",
    "pembelian",
    `Terima Pesanan Pembelian ${po.nomor} (stok masuk gudang)`
  );
  callOasGlobal("renderPesananPembelianPage");
  callOasGlobal("renderDashboard");
  return { ok: true, record: updated };
}

export function batalkanPesananPembelianStore(
  poId: string
): { ok: true; record: PesananPembelianRecord } | { ok: false; pesan: string } {
  const list = readPesananPembelianList();
  const idx = list.findIndex((p) => p.id === poId);
  if (idx < 0) return { ok: false, pesan: "Pesanan pembelian tidak ditemukan." };
  const po = list[idx];
  if (po.status !== "menunggu") {
    return { ok: false, pesan: "Hanya pesanan berstatus Menunggu yang bisa dibatalkan." };
  }

  if (po.bayarSaatPesan) {
    const akunUangMuka = findAkunKode("1501", "uang muka pembelian");
    const ket = `Pembatalan & Pengembalian Dana PO ${po.nomor}`;
    callOasGlobal("addJurnal", {
      tanggal: todayIsoLocal(),
      ket,
      jenis: "Pembelian",
      ref: po.nomor,
      kontakId: po.pemasokId,
      lines: [
        { akun: po.akunBayarKode, ket: `Pengembalian ${po.akunBayarNama}`, debit: po.grandTotal, kredit: 0 },
        { akun: akunUangMuka, ket, debit: 0, kredit: po.grandTotal },
      ],
    });
  }

  const updated: PesananPembelianRecord = { ...po, status: "dibatalkan" };
  list[idx] = updated;
  writePesananPembelianList(list);
  callOasGlobal("renderPesananPembelianPage");
  callOasGlobal("renderDashboard");
  return { ok: true, record: updated };
}
