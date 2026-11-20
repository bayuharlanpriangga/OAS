import type { DokJenis } from "@/types";
import { nomorDokBerikut } from "../dok/nomorDokBerikut";
import { readCounterList } from "./readCounterList";
import { readDokList } from "./readDokList";

export function nomorDokBerikutState(jenis: DokJenis, tahun?: number): string {
  const y = Number.isInteger(tahun)
    ? (tahun as number)
    : new Date().getFullYear();
  return nomorDokBerikut(jenis, y, readDokList(), readCounterList());
}
