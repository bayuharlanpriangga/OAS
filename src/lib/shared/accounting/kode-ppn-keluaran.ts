import type { Akun } from "@/types";

export function akunPpnKeluaranKode(akuns: readonly Akun[]): string {
  if (akuns.find((a) => a.kode === "2301")) return "2301";
  return (
    akuns.find(
      (a) =>
        a.nama.toLowerCase().includes("ppn") && a.tipe === "Liabilitas"
    )?.kode || "2301"
  );
}
