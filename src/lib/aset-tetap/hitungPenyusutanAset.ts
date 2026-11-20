import type { AsetTetap } from "@/types";
import type { AsetPenyusutanResult } from "./types";

export function hitungPenyusutanAset(
  aset: Pick<
    AsetTetap,
    "tglPerolehan" | "hargaPerolehan" | "nilaiResidu" | "umurEkonomis" | "metode"
  >,
  now = new Date()
): AsetPenyusutanResult {
  const tglPerolehan = new Date(aset.tglPerolehan);
  const bulanBerjalan = Math.max(
    0,
    (now.getFullYear() - tglPerolehan.getFullYear()) * 12 +
      (now.getMonth() - tglPerolehan.getMonth())
  );
  const harga = aset.hargaPerolehan;
  const residu = aset.nilaiResidu || 0;
  const umurBln = (aset.umurEkonomis || 1) * 12;
  let akumPenyusutan = 0;

  if (aset.metode === "garis-lurus") {
    akumPenyusutan = Math.min(
      ((harga - residu) / umurBln) * bulanBerjalan,
      harga - residu
    );
  } else {
    const tarif = 2 / (aset.umurEkonomis || 1);
    let nb = harga;
    for (let i = 0; i < Math.min(bulanBerjalan, umurBln); i++) {
      const p = (nb * tarif) / 12;
      akumPenyusutan += p;
      nb -= p;
      if (nb <= residu) {
        akumPenyusutan = harga - residu;
        break;
      }
    }
  }

  return {
    akumPenyusutan: Math.round(akumPenyusutan),
    nilaiBuku: Math.max(residu, Math.round(harga - akumPenyusutan)),
  };
}
