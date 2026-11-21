import type { Akun, SaldoMap } from "@/types";
import type { NeracaSaldoReport, NeracaSaldoRow } from "../shared/types";

export function computeNeracaSaldo(
  akuns: readonly Akun[],
  saldoMap: SaldoMap
): NeracaSaldoReport {
  let totalDebit = 0;
  let totalKredit = 0;
  const rows: NeracaSaldoRow[] = [];

  akuns.forEach((a) => {
    const s = saldoMap[a.kode] || { debit: 0, kredit: 0 };
    if (!s.debit && !s.kredit) return;
    const net = s.debit - s.kredit;
    const debit = net > 0 ? net : 0;
    const kredit = net < 0 ? -net : 0;
    if (!debit && !kredit) return;
    totalDebit += debit;
    totalKredit += kredit;
    rows.push({ kode: a.kode, nama: a.nama, tipe: a.tipe, debit, kredit });
  });

  const selisih = Math.abs(totalDebit - totalKredit);
  return {
    rows,
    totalDebit,
    totalKredit,
    balanced: selisih < 1,
    selisih,
  };
}
