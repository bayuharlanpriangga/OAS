import type { CounterRecord, DokJenis, DokRecord } from "@/types";
import { nomorBerikut } from "../penomoran/nomorBerikut";
import { DOK_JENIS } from "./constants";

export function nomorDokBerikut(
  jenis: DokJenis,
  tahun: number,
  daftar?: readonly DokRecord[],
  counterList?: readonly CounterRecord[]
): string {
  const J = DOK_JENIS[jenis];
  if (!J) throw new TypeError("nomorDokBerikut: jenis dokumen tidak dikenal");
  return nomorBerikut(
    J.awalan,
    tahun,
    (Array.isArray(daftar) ? daftar : []).map((d) => d && d.no),
    counterList
  );
}
