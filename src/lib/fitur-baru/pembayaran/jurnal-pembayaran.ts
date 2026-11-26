import type { Invoice, Pembayaran, JurnalEntry, PembayaranBelumJurnalItem, BuatJurnalPembayaranResult, JurnalPembayaranStatusResult, Bill } from "@/types";
import { JENIS_JURNAL } from "../../shared/accounting";
import { bayarBulat, bayarTanggalValid } from "./alokasi-pembayaran";

export function bayarKetJurnal(pembayaran: Pembayaran, inv: Invoice): string {
  const no = String(
    (inv && inv.noInvoice) || (pembayaran && pembayaran.noDok) || ""
  ).trim();
  return `Pembayaran ${no} · ${String((inv && inv.pelanggan) || "").trim()}`;
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
          ket: "Pelunasan piutang" + (pelanggan ? " · " + pelanggan : ""),
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
      keterangan: `Pembayaran Tagihan ${no} · ${supplier}`,
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
  ).trim()} · ${String(bill.supplier || "").trim()}`;
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
