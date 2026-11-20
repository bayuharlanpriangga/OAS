import type { Bill, BillJurnalStatusResult, JurnalEntry } from "@/types";
import { JENIS_JURNAL } from "../accounting/constants";

export function jurnalBillStatus(
  bill: Bill | null | undefined,
  daftarJurnal: readonly JurnalEntry[],
  daftarBill?: readonly Bill[]
): BillJurnalStatusResult {
  if (!bill || typeof bill !== "object" || bill.status === "draft") {
    return { status: "tanpa", jurnal: null };
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
  const asal = js.filter(
    (j) => j.jenis === JENIS_JURNAL.BILL && !pembalikDari(j)
  );
  const awal =
    "Tagihan " +
    String(bill.noBill || "").trim() +
    " — " +
    String(bill.supplier || "").trim();
  const dibalik = (j: JurnalEntry) => js.some((x) => pembalikDari(x) === j.no);

  let jurnal: JurnalEntry | null = null;
  if (bill.jurnalNo) {
    jurnal =
      asal.find((j) => j.no === bill.jurnalNo && ketJ(j).startsWith(awal)) ||
      null;
  }
  if (!jurnal) {
    const dipakaiLain = new Set(
      (Array.isArray(daftarBill) ? daftarBill : [])
        .filter((b) => b && b !== bill && b.id !== bill.id && b.jurnalNo)
        .map((b) => b.jurnalNo as string)
    );
    const cocok = asal.filter(
      (j) => ketJ(j).startsWith(awal) && !(j.no && dipakaiLain.has(j.no))
    );
    jurnal = cocok.find((j) => !dibalik(j)) || cocok[0] || null;
  }
  if (!jurnal) return { status: "belum", jurnal: null };
  return { status: dibalik(jurnal) ? "dibalik" : "aktif", jurnal };
}
