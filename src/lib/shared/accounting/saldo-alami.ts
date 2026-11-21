import type { Akun, SaldoAkun } from "@/types";

export function plNatural(
  a: Akun | null | undefined,
  s?: Partial<SaldoAkun> | null
): number {
  const saldo = s || { debit: 0, kredit: 0 };
  if (!a) return 0;
  if (a.tipe === "Pendapatan") return (saldo.kredit || 0) - (saldo.debit || 0);
  if (a.tipe === "HPP" || a.tipe === "Beban") {
    return (saldo.debit || 0) - (saldo.kredit || 0);
  }
  return a.normal === "D"
    ? (saldo.debit || 0) - (saldo.kredit || 0)
    : (saldo.kredit || 0) - (saldo.debit || 0);
}
