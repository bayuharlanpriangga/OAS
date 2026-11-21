import type { TahunBukuKode } from "@/types";
import { TB_BULAN_AWAL } from "./constants";

export function getBulanAwalTahunBuku(
  tahunBukuKode?: TahunBukuKode | string | null
): number {
  if (
    tahunBukuKode &&
    Object.prototype.hasOwnProperty.call(TB_BULAN_AWAL, tahunBukuKode)
  ) {
    return TB_BULAN_AWAL[tahunBukuKode as TahunBukuKode];
  }
  return 0;
}
