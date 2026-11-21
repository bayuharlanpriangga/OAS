import type { JurnalEntry, JurnalLine, RingkasanJurnalPembelian } from "@/types";
import { JENIS_JURNAL } from "./constants";

export function ringkasJurnalPembelian(
  j: JurnalEntry | null | undefined
): RingkasanJurnalPembelian {
  const lines = j && Array.isArray(j.lines) ? j.lines : [];
  const bill = !!j && j.jenis === JENIS_JURNAL.BILL;
  const kasUtang = (l: JurnalLine) => l.akun === "1101" || l.akun === "2101";
  const jum = (arr: JurnalLine[], f: "debit" | "kredit") =>
    arr.reduce((s, l) => s + (l[f] || 0), 0);
  const debit = lines.filter((l) => (l.debit || 0) > 0 && (bill || !kasUtang(l)));
  const kreditAll = lines.filter((l) => (l.kredit || 0) > 0);
  const kreditPokok = bill
    ? kreditAll
    : kreditAll.filter(kasUtang).slice(0, 1);
  const m = bill
    ? /^Tagihan (\S+) —/.exec(String(j?.ket || j?.keterangan || ""))
    : null;
  return {
    debit,
    totalDebit: jum(debit, "debit"),
    kredit: jum(kreditPokok, "kredit"),
    tunai: kreditPokok.length > 0 && kreditPokok[0].akun === "1101",
    no: (j && j.ref) || (m ? m[1] : "") || (j && j.no) || "",
  };
}
