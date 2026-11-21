import type {
  Invoice,
  JurnalEntry,
  JurnalPembayaranStatusResult,
  Pembayaran,
} from "@/types";
import { JENIS_JURNAL } from "../../shared/accounting/constants";
import { bayarBulat } from "./pembulatan";
import { bayarKetJurnal } from "./keterangan-jurnal";

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
