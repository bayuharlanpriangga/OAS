import type { CounterRecord } from "@/types";
import { parseNomor } from "./parseNomor";

export function nomorBerikut(
  jenis: string,
  tahun: number,
  daftarNomor?: readonly (string | null | undefined)[] | null,
  counterList?: readonly CounterRecord[] | null
): string {
  if (typeof jenis !== "string" || !/^[A-Za-z0-9]+$/.test(jenis)) {
    throw new TypeError(
      "nomorBerikut: jenis harus berupa huruf/angka tanpa spasi atau tanda hubung"
    );
  }
  if (!Number.isInteger(tahun) || tahun < 1000 || tahun > 9999) {
    throw new TypeError("nomorBerikut: tahun harus bilangan bulat 4 digit");
  }
  const J = jenis.toUpperCase();
  let maks = 0;
  (Array.isArray(daftarNomor) ? daftarNomor : []).forEach((no) => {
    const p = parseNomor(no);
    if (p && p.jenis === J && p.tahun === tahun && p.urut > maks) {
      maks = p.urut;
    }
  });
  const id = `${J}-${tahun}`;
  (Array.isArray(counterList) ? counterList : []).forEach((r) => {
    if (r && r.id === id && Number.isInteger(r.terakhir) && r.terakhir > maks) {
      maks = r.terakhir;
    }
  });
  return `${id}-${String(maks + 1).padStart(3, "0")}`;
}
