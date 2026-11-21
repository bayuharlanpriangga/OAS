import type { Akun, JurnalEntry } from "@/types";

function isAkunPpnKeluar(kode: string, akuns: readonly Akun[]): boolean {
  if (kode === "2301") return true;
  const a = akuns.find((x) => x.kode === kode);
  const nama = (a?.nama || "").toLowerCase();
  return nama.includes("ppn") && nama.includes("keluar");
}

function isAkunPpnMasuk(kode: string, akuns: readonly Akun[]): boolean {
  if (kode === "1502") return true;
  const a = akuns.find((x) => x.kode === kode);
  const nama = (a?.nama || "").toLowerCase();
  return nama.includes("ppn") && nama.includes("masuk");
}

export function getPpnSubBadge(
  j: JurnalEntry | null | undefined,
  akuns: readonly Akun[]
): string | null {
  if (!j || j.jenis === "PPN") return null;
  const lines = j.lines || [];
  if (lines.some((l) => l.kredit > 0 && isAkunPpnKeluar(l.akun, akuns))) {
    return "PPN Keluaran";
  }
  if (lines.some((l) => l.debit > 0 && isAkunPpnMasuk(l.akun, akuns))) {
    return "PPN Masukan";
  }
  return null;
}
