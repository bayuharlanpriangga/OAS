import type {
  Bill,
  JurnalEntry,
  JurnalPembayaranStatusResult,
  Pembayaran,
} from "@/types";
import { JENIS_JURNAL } from "../accounting/constants";
import { bayarBulat } from "./bayarBulat";

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
