import type { JurnalEntry, SaldoMap } from "@/types";
import { getJurnalTanpaPenutup } from "../../shared/accounting/jurnal-tanpa-penutup";

export function getFilteredSaldoPure(
  jurnalEntries: readonly JurnalEntry[],
  periodVal: string = "all",
  opts?: { tanpaPenutup?: boolean },
  now = new Date()
): SaldoMap {
  const y = now.getFullYear();
  const m = now.getMonth();
  let from: Date | null = null;
  let to: Date | null = null;

  if (periodVal === "this-month") {
    from = new Date(y, m, 1);
    to = new Date(y, m + 1, 0);
  } else if (periodVal === "last-month") {
    from = new Date(y, m - 1, 1);
    to = new Date(y, m, 0);
  } else if (periodVal === "this-quarter") {
    const q = Math.floor(m / 3);
    from = new Date(y, q * 3, 1);
    to = new Date(y, q * 3 + 3, 0);
  } else if (periodVal === "this-year") {
    from = new Date(y, 0, 1);
    to = new Date(y, 11, 31);
  }

  const sumber = opts?.tanpaPenutup
    ? getJurnalTanpaPenutup(jurnalEntries)
    : jurnalEntries;

  const filtJurnals =
    from && to
      ? sumber.filter((j) => {
          const d = new Date(j.tanggal);
          return d >= from && d <= to;
        })
      : sumber;

  const map: SaldoMap = {};
  filtJurnals.forEach((j) =>
    (j.lines || []).forEach((l) => {
      if (!map[l.akun]) map[l.akun] = { debit: 0, kredit: 0 };
      map[l.akun].debit += l.debit || 0;
      map[l.akun].kredit += l.kredit || 0;
    })
  );
  return map;
}
