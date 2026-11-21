import type { DokJenis } from "@/types";
import { nomorDokBerikut } from "../../fitur-baru/penawaran/nomor-berikut";
import { readCounterList } from "./baca-counter";
import { readDokList } from "./baca-dokumen";

export function nomorDokBerikutState(jenis: DokJenis, tahun?: number): string {
  const y = Number.isInteger(tahun)
    ? (tahun as number)
    : new Date().getFullYear();
  return nomorDokBerikut(jenis, y, readDokList(), readCounterList());
}
