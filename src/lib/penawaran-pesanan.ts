import type {
  CounterRecord,
  DokFormInput,
  DokRecord,
  Invoice,
} from "@/types";
import { hitungPpn, PPN_TARIF_STANDAR } from "./accounting";
import { hitungTotalDok, idDokBaru, nomorDokBerikut, susunDok } from "./dok";
import { nomorBerikut } from "./penomoran";

export interface AksiDokStatus {
  ke: string;
  label: string;
  utama?: boolean;
  bahaya?: boolean;
}

export function berlakuDefaultPenawaran(
  tanggal: string,
  hari = 14
): string {
  if (typeof tanggal !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) {
    return "";
  }
  const d = new Date(tanggal + "T00:00:00Z");
  if (isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== tanggal) return "";
  d.setUTCDate(d.getUTCDate() + (Number.isInteger(hari) ? hari : 14));
  return d.toISOString().slice(0, 10);
}

export function aksiStatusPenawaran(status: string): AksiDokStatus[] {
  const peta: Record<string, AksiDokStatus[]> = {
    draft: [
      { ke: "terkirim", label: "Kirim", utama: true },
      { ke: "batal", label: "Batalkan", bahaya: true },
    ],
    terkirim: [
      { ke: "disetujui", label: "Disetujui", utama: true },
      { ke: "ditolak", label: "Ditolak", bahaya: true },
      { ke: "batal", label: "Batalkan", bahaya: true },
    ],
    disetujui: [
      { ke: "selesai", label: "Selesai", utama: true },
      { ke: "batal", label: "Batalkan", bahaya: true },
    ],
  };
  return peta[status] || [];
}

export function pesananDariRef(
  daftar: readonly DokRecord[],
  refJenis: string,
  refId: string
): DokRecord | null {
  if (!refJenis || !refId) return null;
  return (
    (Array.isArray(daftar) ? daftar : []).find(
      (d) =>
        d &&
        d.jenis === "pesanan_jual" &&
        d.refJenis === refJenis &&
        d.refId === refId &&
        d.status !== "batal"
    ) || null
  );
}

export function pesananDariPenawaran(
  penawaran: DokRecord | null | undefined,
  opsi?: {
    daftar?: readonly DokRecord[];
    counterList?: readonly CounterRecord[];
    tanggal?: string;
    id?: string;
    no?: string;
    createdAt?: string;
  }
): { ok: true; dok: DokRecord } | { ok: false; pesan: string } {
  const gagal = (pesan: string) => ({ ok: false as const, pesan });
  const o = opsi || {};
  if (
    !penawaran ||
    typeof penawaran !== "object" ||
    penawaran.jenis !== "penawaran"
  ) {
    return gagal("Penawaran tidak ditemukan.");
  }
  if (penawaran.status !== "disetujui") {
    return gagal(
      "Hanya penawaran berstatus Disetujui yang bisa dijadikan Pesanan Penjualan."
    );
  }
  const daftar = Array.isArray(o.daftar) ? o.daftar : [];
  const sudah = pesananDariRef(daftar, "penawaran", penawaran.id);
  if (sudah) {
    return gagal(
      "Penawaran ini sudah punya Pesanan Penjualan (" + sudah.no + ")."
    );
  }
  const tanggal =
    typeof o.tanggal === "string" && /^\d{4}-\d{2}-\d{2}$/.test(o.tanggal)
      ? o.tanggal
      : penawaran.tanggal;
  const tahun = parseInt(tanggal.slice(0, 4), 10);
  const no =
    o.no || nomorDokBerikut("pesanan_jual", tahun, daftar, o.counterList);
  const id = o.id || idDokBaru(daftar);
  const createdAt = o.createdAt || new Date().toISOString();
  const items = (Array.isArray(penawaran.items) ? penawaran.items : []).map(
    (it) => {
      const b: { nama: string; qty: number; harga: number; satuan?: string } = {
        nama: it.nama,
        qty: it.qty,
        harga: it.harga,
      };
      if (it.satuan) b.satuan = it.satuan;
      return b;
    }
  );
  const form: DokFormInput = {
    id,
    jenis: "pesanan_jual",
    no,
    tanggal,
    kontak: penawaran.kontak,
    items,
    catatan: penawaran.catatan || "",
    ppnTarif: penawaran.ppnTarif || 0,
    refJenis: "penawaran",
    refId: penawaran.id,
    refNo: penawaran.no,
    createdAt,
  };
  return susunDok(form, daftar);
}

export function aksiStatusPesanan(status: string): AksiDokStatus[] {
  const peta: Record<string, AksiDokStatus[]> = {
    draft: [
      { ke: "dikonfirmasi", label: "Konfirmasi", utama: true },
      { ke: "batal", label: "Batalkan", bahaya: true },
    ],
    dikonfirmasi: [
      { ke: "selesai", label: "Selesai", utama: true },
      { ke: "batal", label: "Batalkan", bahaya: true },
    ],
    sebagian: [
      { ke: "selesai", label: "Selesai", utama: true },
      { ke: "batal", label: "Batalkan", bahaya: true },
    ],
  };
  return peta[status] || [];
}

export function bolehHapusPesanan(dok: DokRecord | null | undefined): boolean {
  return !!dok && dok.jenis === "pesanan_jual" && dok.status === "draft";
}

export interface PesananInvoiceRecord extends Invoice {
  refJenis?: string;
  refId?: string;
  refNo?: string;
}

export function invoiceDariPesanan(
  daftarInvoice: readonly PesananInvoiceRecord[],
  pesananId: string
): PesananInvoiceRecord | null {
  if (!pesananId) return null;
  return (
    (Array.isArray(daftarInvoice) ? daftarInvoice : []).find(
      (i) => i && i.refJenis === "pesanan_jual" && i.refId === pesananId
    ) || null
  );
}

export function pesananKeInvoice(
  pesanan: DokRecord | null | undefined,
  opsi?: {
    invoices?: readonly PesananInvoiceRecord[];
    counterList?: readonly CounterRecord[];
    tanggal?: string;
    jatuhTempo?: string;
    id?: string;
    noInvoice?: string;
    createdAt?: string;
    akunPiutang?: string;
    akunPend?: string;
  }
):
  | { ok: true; invoice: PesananInvoiceRecord }
  | { ok: false; pesan: string } {
  const gagal = (pesan: string) => ({ ok: false as const, pesan });
  const o = opsi || {};
  if (
    !pesanan ||
    typeof pesanan !== "object" ||
    pesanan.jenis !== "pesanan_jual"
  ) {
    return gagal("Pesanan penjualan tidak ditemukan.");
  }
  if (pesanan.status !== "dikonfirmasi" && pesanan.status !== "sebagian") {
    return gagal(
      "Hanya pesanan berstatus Dikonfirmasi atau Sebagian yang bisa dijadikan Invoice."
    );
  }
  const invoices = Array.isArray(o.invoices) ? o.invoices : [];
  const sudah = invoiceDariPesanan(invoices, pesanan.id);
  if (sudah) {
    return gagal(
      "Pesanan ini sudah punya Invoice (" + (sudah.noInvoice || sudah.id) + ")."
    );
  }
  const tanggal =
    typeof o.tanggal === "string" && /^\d{4}-\d{2}-\d{2}$/.test(o.tanggal)
      ? o.tanggal
      : pesanan.tanggal;
  const tahun = parseInt(tanggal.slice(0, 4), 10);
  const noInvoice =
    o.noInvoice ||
    nomorBerikut(
      "INV",
      tahun,
      invoices.map((i) => i && i.noInvoice),
      o.counterList
    );
  const jatuhTempo =
    typeof o.jatuhTempo === "string" && /^\d{4}-\d{2}-\d{2}$/.test(o.jatuhTempo)
      ? o.jatuhTempo
      : berlakuDefaultPenawaran(tanggal, 30) || tanggal;

  const items = (Array.isArray(pesanan.items) ? pesanan.items : []).map(
    (it) => ({
      nama: it.nama,
      qty: it.qty,
      harga: it.harga,
    })
  );
  if (!items.length) return gagal("Pesanan tidak memiliki item.");

  const { subtotal } = hitungTotalDok(pesanan);
  const ppnTarif =
    typeof pesanan.ppnTarif === "number" &&
    isFinite(pesanan.ppnTarif) &&
    pesanan.ppnTarif > 0
      ? pesanan.ppnTarif
      : 0;
  const ppn = ppnTarif ? hitungPpn(subtotal, ppnTarif) : 0;
  const total = subtotal + ppn;

  const invoice: PesananInvoiceRecord = {
    id: o.id || "INV_" + Date.now(),
    noInvoice,
    pelanggan: pesanan.kontak,
    tanggal,
    jatuhTempo,
    deskripsi: pesanan.catatan
      ? `Pesanan ${pesanan.no} — ${pesanan.catatan}`
      : `Pesanan ${pesanan.no}`,
    items,
    subtotal,
    ppn,
    ppnTarif: ppnTarif || 0,
    total,
    sisaTagihan: total,
    status: "draft",
    akunPiutang: o.akunPiutang || "1201",
    akunPend: o.akunPend || "4101",
    createdAt: o.createdAt || new Date().toISOString(),
    refJenis: "pesanan_jual",
    refId: pesanan.id,
    refNo: pesanan.no,
  };
  return { ok: true, invoice };
}

export { PPN_TARIF_STANDAR };
