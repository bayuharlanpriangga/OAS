import type { Akun } from "@/types";

export function cariAkunPpnMasukan(daftarAkun: readonly Akun[]): string {
  const a = (Array.isArray(daftarAkun) ? daftarAkun : []).filter(
    (x) => x && x.kode
  );
  if (a.some((x) => x.kode === "1502")) return "1502";
  const f = a.find((x) => /ppn masukan/i.test(x.nama || ""));
  return f ? f.kode : "1502";
}
