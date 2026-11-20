import type { Akun, JurnalEntry } from "@/types";

export function getSaldoAkunPure(
  jurnalEntries: readonly JurnalEntry[],
  akuns: readonly Akun[],
  kode: string
): number {
  let d = 0;
  let k = 0;
  jurnalEntries.forEach((j) =>
    (j.lines || []).forEach((l) => {
      if (l.akun === kode) {
        d += l.debit || 0;
        k += l.kredit || 0;
      }
    })
  );
  const akun = akuns.find((a) => a.kode === kode);
  return akun?.normal === "D" ? d - k : k - d;
}
