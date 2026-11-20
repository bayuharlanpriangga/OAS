import type {
  AlokasiPembayaranFormInput,
  AlokasiPerubahan,
  Bill,
  BuatJurnalPembayaranResult,
  DokumenTagihan,
  Invoice,
  JurnalEntry,
  JurnalPembayaranStatusResult,
  Pembayaran,
  PembayaranBelumJurnalItem,
  PembayaranFormInput,
  PembayaranJenis,
  SusunAlokasiResult,
  SusunHapusPembayaranResult,
  SusunPembayaranResult,
} from "@/types";
import { JENIS_JURNAL } from "./accounting";

export const PEMBAYARAN_JENIS: readonly PembayaranJenis[] = ["invoice", "bill"];

export const PEMBAYARAN_STATUS_LANJUT: Record<
  PembayaranJenis,
  readonly string[]
> = {
  invoice: ["terkirim", "sebagian"],
  bill: ["diterima", "sebagian"],
};

function bayarBulat(n: number): number {
  return Math.round(n * 100) / 100;
}

function bayarTanggalValid(s: unknown): boolean {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + "T00:00:00Z");
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export function pembayaranDokumen(
  daftar: readonly Pembayaran[],
  jenis: PembayaranJenis,
  dokId: string
): Pembayaran[] {
  if (
    !PEMBAYARAN_JENIS.includes(jenis) ||
    dokId === undefined ||
    dokId === null ||
    dokId === ""
  ) {
    return [];
  }
  return (Array.isArray(daftar) ? daftar : []).filter(
    (p) =>
      p &&
      typeof p === "object" &&
      p.jenis === jenis &&
      String(p.dokId) === String(dokId) &&
      typeof p.jumlah === "number" &&
      isFinite(p.jumlah) &&
      p.jumlah > 0
  );
}

export function totalDibayar(
  dok: DokumenTagihan | null | undefined,
  daftar: readonly Pembayaran[],
  jenis: PembayaranJenis
): number {
  if (!dok || typeof dok !== "object") return 0;
  const lama =
    typeof dok.dibayarLama === "number" &&
    isFinite(dok.dibayarLama) &&
    dok.dibayarLama > 0
      ? dok.dibayarLama
      : 0;
  const baru = pembayaranDokumen(daftar, jenis, dok.id).reduce(
    (s, p) => s + p.jumlah,
    0
  );
  return bayarBulat(lama + baru);
}

export function sisaTagihan(
  dok: DokumenTagihan | null | undefined,
  daftar: readonly Pembayaran[],
  jenis: PembayaranJenis
): number {
  if (
    !dok ||
    typeof dok !== "object" ||
    typeof dok.total !== "number" ||
    !isFinite(dok.total)
  ) {
    return 0;
  }
  return Math.max(0, bayarBulat(dok.total - totalDibayar(dok, daftar, jenis)));
}

export function dibayarLamaTurunan(
  dok: DokumenTagihan | null | undefined,
  daftar: readonly Pembayaran[],
  jenis: PembayaranJenis
): number {
  if (
    !dok ||
    typeof dok !== "object" ||
    typeof dok.total !== "number" ||
    !isFinite(dok.total)
  ) {
    return 0;
  }
  const lama =
    typeof dok.dibayarLama === "number" &&
    isFinite(dok.dibayarLama) &&
    dok.dibayarLama > 0
      ? dok.dibayarLama
      : 0;
  if (typeof dok.sisaTagihan !== "number" || !isFinite(dok.sisaTagihan)) {
    return bayarBulat(Math.min(dok.total, lama));
  }
  const catat = pembayaranDokumen(daftar, jenis, dok.id).reduce(
    (s, p) => s + p.jumlah,
    0
  );
  const tersirat = bayarBulat(
    dok.total - Math.max(0, dok.sisaTagihan) - catat
  );
  return bayarBulat(
    Math.min(dok.total, Math.max(lama, tersirat > 0 ? tersirat : 0))
  );
}

export function susunPembayaran(
  f: PembayaranFormInput,
  dok: DokumenTagihan | null | undefined,
  daftar: readonly Pembayaran[],
  jenis: PembayaranJenis = "invoice"
): SusunPembayaranResult {
  const gagal = (pesan: string): SusunPembayaranResult => ({ ok: false, pesan });
  const input = f || {};
  if (!PEMBAYARAN_JENIS.includes(jenis)) {
    return gagal("Jenis dokumen tidak dikenal.");
  }
  const label = jenis === "bill" ? "Tagihan" : "Invoice";
  if (
    !dok ||
    typeof dok !== "object" ||
    dok.id === undefined ||
    dok.id === null ||
    dok.id === ""
  ) {
    return gagal(`${label} yang dibayar tidak ditemukan.`);
  }
  if (
    typeof dok.total !== "number" ||
    !isFinite(dok.total) ||
    dok.total <= 0
  ) {
    return gagal(`Total ${label.toLowerCase()} tidak valid.`);
  }
  if (!PEMBAYARAN_STATUS_LANJUT[jenis].includes(dok.status)) {
    if (dok.status === "lunas") return gagal(`${label} ini sudah lunas.`);
    if (dok.status === "draft") {
      return gagal(`${label} ini masih draft, belum bisa dibayar.`);
    }
    return gagal(`Status ${label.toLowerCase()} ini tidak bisa dibayar.`);
  }

  const tanggal = typeof input.tanggal === "string" ? input.tanggal.trim() : "";
  if (!bayarTanggalValid(tanggal)) {
    return gagal("Isi tanggal pembayaran yang valid.");
  }
  if (bayarTanggalValid(dok.tanggal) && tanggal < dok.tanggal) {
    return gagal(
      `Tanggal pembayaran tidak boleh sebelum tanggal ${label.toLowerCase()} (${dok.tanggal}).`
    );
  }

  const akunKas = typeof input.akunKas === "string" ? input.akunKas.trim() : "";
  if (!akunKas) return gagal("Pilih akun kas/bank.");

  const id = typeof input.id === "string" ? input.id.trim() : "";
  if (!id) return gagal("ID pembayaran kosong.");
  if ((Array.isArray(daftar) ? daftar : []).some((p) => p && p.id === id)) {
    return gagal("ID pembayaran sudah dipakai.");
  }
  const createdAt =
    typeof input.createdAt === "string" ? input.createdAt : "";
  if (!createdAt) return gagal("Waktu pembuatan pembayaran kosong.");

  if (typeof input.jumlah !== "number" || !isFinite(input.jumlah)) {
    return gagal("Isi jumlah pembayaran.");
  }
  const jumlah = bayarBulat(input.jumlah);
  if (jumlah <= 0) return gagal("Jumlah pembayaran harus lebih dari 0.");

  const lama = dibayarLamaTurunan(dok, daftar, jenis);
  const sisa = sisaTagihan(
    Object.assign({}, dok, { dibayarLama: lama }),
    daftar,
    jenis
  );
  if (sisa <= 0) return gagal(`${label} ini sudah tidak punya sisa tagihan.`);
  if (jumlah > sisa) {
    return gagal(
      `Jumlah melebihi sisa tagihan (Rp ${sisa.toLocaleString("id-ID")}).`
    );
  }

  const pembayaran: Pembayaran = {
    id,
    jenis,
    dokId: dok.id,
    noDok: String(dok.noInvoice || dok.noBill || ""),
    tanggal,
    jumlah,
    akunKas,
    createdAt,
  };
  const metode = typeof input.metode === "string" ? input.metode.trim() : "";
  const catatan = typeof input.catatan === "string" ? input.catatan.trim() : "";
  if (metode) pembayaran.metode = metode;
  if (catatan) pembayaran.catatan = catatan;

  const sisaBaru = bayarBulat(sisa - jumlah);
  return {
    ok: true,
    pembayaran,
    dibayarLama: lama,
    sisaBaru,
    lunas: sisaBaru <= 0,
  };
}

export function susunAlokasiPembayaran(
  f: AlokasiPembayaranFormInput,
  invoices: readonly Invoice[],
  daftar: readonly Pembayaran[]
): SusunAlokasiResult {
  const gagal = (pesan: string): SusunAlokasiResult => ({ ok: false, pesan });
  const input = f || {};
  const listInv = Array.isArray(invoices) ? invoices : [];
  const alokasi = Array.isArray(input.alokasi) ? input.alokasi : [];
  const grupId = typeof input.id === "string" ? input.id.trim() : "";
  if (!grupId) return gagal("ID penerimaan kosong.");
  if (!input.createdAt || typeof input.createdAt !== "string") {
    return gagal("Waktu pembuatan pembayaran kosong.");
  }
  if (
    !bayarTanggalValid(
      typeof input.tanggal === "string" ? input.tanggal.trim() : ""
    )
  ) {
    return gagal("Isi tanggal pembayaran yang valid.");
  }
  if (
    typeof input.jumlah !== "number" ||
    !isFinite(input.jumlah) ||
    bayarBulat(input.jumlah) <= 0
  ) {
    return gagal("Jumlah penerimaan harus lebih dari 0.");
  }
  if (typeof input.akunKas !== "string" || !input.akunKas.trim()) {
    return gagal("Pilih akun kas/bank.");
  }
  if (!alokasi.length) {
    return gagal("Tambahkan minimal satu invoice untuk dialokasikan.");
  }

  const idTerpakai = new Set(
    (Array.isArray(daftar) ? daftar : [])
      .filter((p) => p && p.id != null)
      .map((p) => String(p.id))
  );
  const dokTerpakai = new Set<string>();
  const pembayaran: Pembayaran[] = [];
  const perubahan: AlokasiPerubahan[] = [];
  let totalDialokasikan = 0;

  for (let i = 0; i < alokasi.length; i++) {
    const item = alokasi[i] || {};
    if (
      item.dokId === undefined ||
      item.dokId === null ||
      String(item.dokId).trim() === ""
    ) {
      return gagal(`Invoice pada alokasi ke-${i + 1} tidak valid.`);
    }
    const dokId = String(item.dokId);
    if (dokTerpakai.has(dokId)) {
      return gagal("Invoice yang sama tidak boleh dialokasikan lebih dari sekali.");
    }
    dokTerpakai.add(dokId);
    const inv = listInv.find((d) => d && String(d.id) === dokId);
    if (!inv) {
      return gagal(`Invoice pada alokasi ke-${i + 1} tidak ditemukan.`);
    }
    const jumlah =
      typeof item.jumlah === "number" && isFinite(item.jumlah)
        ? bayarBulat(item.jumlah)
        : NaN;
    if (!isFinite(jumlah) || jumlah <= 0) {
      return gagal("Jumlah alokasi setiap invoice harus lebih dari 0.");
    }

    const paymentId = `${grupId}_${i + 1}`;
    if (idTerpakai.has(paymentId)) {
      return gagal("ID pembayaran batch sudah dipakai.");
    }
    const hasil = susunPembayaran(
      {
        id: paymentId,
        createdAt: input.createdAt,
        tanggal: input.tanggal,
        jumlah,
        akunKas: input.akunKas,
        metode: input.metode,
        catatan: input.catatan,
      },
      inv,
      daftar,
      "invoice"
    );
    if (!hasil.ok) {
      return gagal(`Invoice ${String(inv.noInvoice || inv.id)}: ${hasil.pesan}`);
    }

    const record: Pembayaran = Object.assign({}, hasil.pembayaran, { grupId });
    pembayaran.push(record);
    perubahan.push({
      dokId: inv.id,
      dibayarLama: hasil.dibayarLama,
      sisaBaru: hasil.sisaBaru,
      lunas: hasil.lunas,
    });
    totalDialokasikan = bayarBulat(totalDialokasikan + jumlah);
  }

  const jumlahBatch = bayarBulat(input.jumlah);
  if (totalDialokasikan !== jumlahBatch) {
    return gagal(
      `Total alokasi (Rp ${totalDialokasikan.toLocaleString("id-ID")}) harus sama dengan jumlah penerimaan (Rp ${jumlahBatch.toLocaleString("id-ID")}).`
    );
  }
  return { ok: true, grupId, pembayaran, perubahan, totalDialokasikan };
}

export function statusDariPembayaran(
  dok: DokumenTagihan | null | undefined,
  daftar: readonly Pembayaran[],
  jenis: PembayaranJenis = "invoice"
): string {
  if (!dok || typeof dok !== "object") return "";
  const asal = (typeof dok.status === "string" ? dok.status : "").trim();
  const dasar =
    jenis === "invoice" ? "terkirim" : jenis === "bill" ? "diterima" : "";
  const statusTerhitung = PEMBAYARAN_STATUS_LANJUT[jenis];
  if (
    !dasar ||
    ((!statusTerhitung || !statusTerhitung.includes(asal)) && asal !== "lunas")
  ) {
    return asal;
  }

  const total =
    typeof dok.total === "number" && isFinite(dok.total) ? dok.total : 0;
  if (total <= 0) return asal;

  const sisa = sisaTagihan(dok, daftar, jenis);
  if (sisa <= 0) return "lunas";

  const dibayar = totalDibayar(dok, daftar, jenis);
  if (dibayar > 0 && sisa < total) return "sebagian";
  return dasar;
}

function bayarKetJurnal(pembayaran: Pembayaran, inv: Invoice): string {
  const no = String(
    (inv && inv.noInvoice) || (pembayaran && pembayaran.noDok) || ""
  ).trim();
  return `Pembayaran ${no} — ${String((inv && inv.pelanggan) || "").trim()}`;
}

export function buatJurnalPembayaranInvoice(
  pembayaran: Pembayaran | null | undefined,
  inv: Invoice | null | undefined,
  opsi?: { akunPiutang?: string }
): BuatJurnalPembayaranResult {
  const gagal = (pesan: string): BuatJurnalPembayaranResult => ({
    ok: false,
    pesan,
  });
  const teks = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  if (
    !pembayaran ||
    typeof pembayaran !== "object" ||
    pembayaran.jenis !== "invoice"
  ) {
    return gagal("Pembayaran invoice tidak valid.");
  }
  if (!inv || typeof inv !== "object") {
    return gagal("Invoice untuk pembayaran ini tidak ditemukan.");
  }
  if (String(pembayaran.dokId) !== String(inv.id)) {
    return gagal("Pembayaran ini bukan milik invoice tersebut.");
  }
  const jumlah =
    typeof pembayaran.jumlah === "number" && isFinite(pembayaran.jumlah)
      ? bayarBulat(pembayaran.jumlah)
      : 0;
  if (jumlah <= 0) return gagal("Jumlah pembayaran tidak valid.");
  const tanggal = teks(pembayaran.tanggal);
  if (!bayarTanggalValid(tanggal)) {
    return gagal("Tanggal pembayaran tidak valid.");
  }
  const akunKas = teks(pembayaran.akunKas);
  if (!akunKas) return gagal("Akun kas/bank pembayaran kosong.");
  const akunPiutang =
    teks(inv.akunPiutang) || teks(opsi && opsi.akunPiutang);
  if (!akunPiutang) {
    return gagal(
      "Invoice ini tidak punya akun piutang, jurnal pembayaran tidak bisa dibuat."
    );
  }
  if (akunKas === akunPiutang) {
    return gagal("Akun kas/bank dan akun piutang tidak boleh sama.");
  }
  const no = teks(inv.noInvoice) || teks(pembayaran.noDok);
  const pelanggan = teks(inv.pelanggan);

  return {
    ok: true,
    jurnal: {
      tanggal,
      jenis: JENIS_JURNAL.INVOICE,
      keterangan: bayarKetJurnal(pembayaran, inv),
      ref: no,
      lines: [
        { akun: akunKas, ket: "Penerimaan " + no, debit: jumlah, kredit: 0 },
        {
          akun: akunPiutang,
          ket: "Pelunasan piutang" + (pelanggan ? " — " + pelanggan : ""),
          debit: 0,
          kredit: jumlah,
        },
      ],
    },
  };
}

export function jurnalPembayaranStatus(
  pembayaran: Pembayaran | null | undefined,
  inv: Invoice | null | undefined,
  daftarJurnal: readonly JurnalEntry[],
  daftarPembayaran?: readonly Pembayaran[]
): JurnalPembayaranStatusResult {
  if (
    !pembayaran ||
    typeof pembayaran !== "object" ||
    pembayaran.jenis !== "invoice" ||
    !inv ||
    typeof inv !== "object"
  ) {
    return { status: "belum", jurnal: null };
  }
  const js = (Array.isArray(daftarJurnal) ? daftarJurnal : []).filter(
    (j) => j && typeof j === "object"
  );
  const ketJ = (j: JurnalEntry) => String(j.ket || j.keterangan || "");
  const pembalikDari = (j: JurnalEntry) => {
    if (j.reversalOf) return String(j.reversalOf);
    const m = /^\[Pembalik ([^\]]+)\]/.exec(ketJ(j));
    return m ? m[1].trim() : "";
  };
  const jenis = JENIS_JURNAL.INVOICE;
  const asal = js.filter((j) => j.jenis === jenis && !pembalikDari(j));
  const awal = bayarKetJurnal(pembayaran, inv);
  const jumlah =
    typeof pembayaran.jumlah === "number" && isFinite(pembayaran.jumlah)
      ? bayarBulat(pembayaran.jumlah)
      : NaN;
  const dibalik = (j: JurnalEntry) => js.some((x) => pembalikDari(x) === j.no);
  const isiCocok = (j: JurnalEntry) =>
    String(j.tanggal || "").slice(0, 10) === pembayaran.tanggal &&
    (Array.isArray(j.lines) ? j.lines : []).some(
      (l) =>
        l &&
        l.akun === pembayaran.akunKas &&
        bayarBulat(l.debit || 0) === jumlah
    );

  let jurnal: JurnalEntry | null = null;
  if (pembayaran.jurnalNo) {
    jurnal =
      asal.find(
        (j) => j.no === pembayaran.jurnalNo && ketJ(j).startsWith(awal)
      ) || null;
  }
  if (!jurnal) {
    const dipakaiLain = new Set(
      (Array.isArray(daftarPembayaran) ? daftarPembayaran : [])
        .filter((p) => p && p !== pembayaran && p.id !== pembayaran.id && p.jurnalNo)
        .map((p) => p.jurnalNo as string)
    );
    const cocok = asal.filter(
      (j) =>
        ketJ(j).startsWith(awal) &&
        isiCocok(j) &&
        !(j.no && dipakaiLain.has(j.no))
    );
    jurnal = cocok.find((j) => !dibalik(j)) || cocok[0] || null;
  }
  if (!jurnal) return { status: "belum", jurnal: null };
  return { status: dibalik(jurnal) ? "dibalik" : "aktif", jurnal };
}

export function pembayaranInvoiceBelumJurnal(
  daftarPembayaran: readonly Pembayaran[],
  daftarInvoice: readonly Invoice[],
  daftarJurnal: readonly JurnalEntry[]
): PembayaranBelumJurnalItem[] {
  const invs = Array.isArray(daftarInvoice) ? daftarInvoice : [];
  const semua = Array.isArray(daftarPembayaran) ? daftarPembayaran : [];
  const hasil: PembayaranBelumJurnalItem[] = [];
  semua.forEach((p) => {
    if (!p || typeof p !== "object" || p.jenis !== "invoice") return;
    if (!(typeof p.jumlah === "number" && isFinite(p.jumlah) && p.jumlah > 0)) {
      return;
    }
    const inv = invs.find((i) => i && String(i.id) === String(p.dokId));
    if (!inv) return;
    if (jurnalPembayaranStatus(p, inv, daftarJurnal, semua).status !== "belum") {
      return;
    }
    hasil.push({ pembayaran: p, invoice: inv });
  });
  return hasil;
}

export function buatJurnalPembayaranBill(
  pembayaran: Pembayaran | null | undefined,
  bill: Bill | null | undefined
): BuatJurnalPembayaranResult {
  const gagal = (pesan: string): BuatJurnalPembayaranResult => ({
    ok: false,
    pesan,
  });
  const teks = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  if (!pembayaran || pembayaran.jenis !== "bill") {
    return gagal("Pembayaran tagihan tidak valid.");
  }
  if (!bill || String(pembayaran.dokId) !== String(bill.id)) {
    return gagal("Tagihan untuk pembayaran ini tidak ditemukan.");
  }
  const jumlah =
    typeof pembayaran.jumlah === "number" && isFinite(pembayaran.jumlah)
      ? bayarBulat(pembayaran.jumlah)
      : 0;
  if (jumlah <= 0) return gagal("Jumlah pembayaran tidak valid.");
  if (!bayarTanggalValid(teks(pembayaran.tanggal))) {
    return gagal("Tanggal pembayaran tidak valid.");
  }
  const akunKas = teks(pembayaran.akunKas);
  const akunUtang = teks(bill.akunUtang);
  if (!akunKas) return gagal("Akun kas/bank pembayaran kosong.");
  if (!akunUtang) return gagal("Tagihan ini tidak punya akun utang usaha.");
  if (akunKas === akunUtang) {
    return gagal("Akun kas/bank dan akun utang tidak boleh sama.");
  }
  const no = teks(bill.noBill) || teks(pembayaran.noDok);
  const supplier = teks(bill.supplier);

  return {
    ok: true,
    jurnal: {
      tanggal: pembayaran.tanggal,
      jenis: JENIS_JURNAL.BILL,
      keterangan: `Pembayaran Tagihan ${no} — ${supplier}`,
      ref: no,
      lines: [
        { akun: akunUtang, ket: "Pembayaran utang " + no, debit: jumlah, kredit: 0 },
        {
          akun: akunKas,
          ket: "Pengeluaran pembayaran " + no,
          debit: 0,
          kredit: jumlah,
        },
      ],
    },
  };
}

export function jurnalPembayaranBillStatus(
  pembayaran: Pembayaran | null | undefined,
  bill: Bill | null | undefined,
  daftarJurnal: readonly JurnalEntry[],
  daftarPembayaran?: readonly Pembayaran[]
): JurnalPembayaranStatusResult {
  if (!pembayaran || pembayaran.jenis !== "bill" || !bill) {
    return { status: "belum", jurnal: null };
  }
  const jenis = JENIS_JURNAL.BILL;
  const js = (Array.isArray(daftarJurnal) ? daftarJurnal : []).filter(
    (j) => j && j.jenis === jenis
  );
  const ketAwal = `Pembayaran Tagihan ${String(
    bill.noBill || pembayaran.noDok || ""
  ).trim()} — ${String(bill.supplier || "").trim()}`;
  const pembalikDari = (j: JurnalEntry) =>
    j.reversalOf
      ? String(j.reversalOf)
      : (/^\[Pembalik ([^\]]+)\]/.exec(String(j.ket || j.keterangan || "")) ||
          [])[1] || "";
  const asal = js.filter((j) => !pembalikDari(j));
  const dibalik = (j: JurnalEntry) => js.some((x) => pembalikDari(x) === j.no);
  const jumlah = bayarBulat(Number(pembayaran.jumlah) || 0);
  const cocokIsi = (j: JurnalEntry) =>
    String(j.tanggal || "").slice(0, 10) === pembayaran.tanggal &&
    (j.lines || []).some(
      (l) =>
        l &&
        l.akun === pembayaran.akunKas &&
        bayarBulat(l.kredit || 0) === jumlah
    );

  let jurnal: JurnalEntry | null = pembayaran.jurnalNo
    ? asal.find(
        (j) =>
          j.no === pembayaran.jurnalNo &&
          String(j.ket || j.keterangan || "").startsWith(ketAwal)
      ) || null
    : null;
  if (!jurnal) {
    const dipakai = new Set(
      (Array.isArray(daftarPembayaran) ? daftarPembayaran : [])
        .filter((x) => x && x !== pembayaran && x.id !== pembayaran.id && x.jurnalNo)
        .map((x) => x.jurnalNo as string)
    );
    const temuan = asal.filter(
      (j) =>
        String(j.ket || j.keterangan || "").startsWith(ketAwal) &&
        cocokIsi(j) &&
        !(j.no && dipakai.has(j.no))
    );
    jurnal = temuan.find((j) => !dibalik(j)) || temuan[0] || null;
  }
  return jurnal
    ? { status: dibalik(jurnal) ? "dibalik" : "aktif", jurnal }
    : { status: "belum", jurnal: null };
}

export function susunHapusPembayaran(
  id: string,
  dok: DokumenTagihan | null | undefined,
  daftar: readonly Pembayaran[],
  daftarJurnal: readonly JurnalEntry[]
): SusunHapusPembayaranResult {
  const gagal = (pesan: string): SusunHapusPembayaranResult => ({
    ok: false,
    pesan,
  });
  const semua = Array.isArray(daftar) ? daftar : [];
  const p = semua.find(
    (x) => x && typeof x === "object" && String(x.id) === String(id)
  );
  if (!p) return gagal("Pembayaran tidak ditemukan.");
  if (!PEMBAYARAN_JENIS.includes(p.jenis)) {
    return gagal("Jenis pembayaran tidak dikenal.");
  }
  const jenis = p.jenis;
  const daftarBaru = semua.filter((x) => x !== p);
  if (!dok || typeof dok !== "object" || String(dok.id) !== String(p.dokId)) {
    return {
      ok: true,
      pembayaran: p,
      daftarBaru,
      dibayarLama: 0,
      sisaBaru: 0,
      statusBaru: undefined,
      jurnalStatus: "belum",
      jurnal: null,
      yatim: true,
    };
  }
  const dibayarLama = dibayarLamaTurunan(dok, semua, jenis);
  const sisaBaru = sisaTagihan(
    Object.assign({}, dok, { dibayarLama }),
    daftarBaru,
    jenis
  );
  const dokBaru = Object.assign({}, dok, {
    dibayarLama,
    sisaTagihan: sisaBaru,
  });
  const statusBaru = statusDariPembayaran(dokBaru, daftarBaru, jenis);
  const st =
    jenis === "bill"
      ? jurnalPembayaranBillStatus(p, dok as Bill, daftarJurnal, semua)
      : jurnalPembayaranStatus(p, dok as Invoice, daftarJurnal, semua);
  return {
    ok: true,
    pembayaran: p,
    daftarBaru,
    dibayarLama,
    sisaBaru,
    statusBaru,
    jurnalStatus: st.status,
    jurnal: st.jurnal,
    yatim: false,
  };
}
