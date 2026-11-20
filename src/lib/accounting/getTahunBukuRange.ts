import type { TahunBukuKode, TahunBukuRange } from "@/types";
import { ymd } from "../format";
import { getBulanAwalTahunBuku } from "./getBulanAwalTahunBuku";

export function getTahunBukuRange(
  tanggal: string,
  tahunBukuKode?: TahunBukuKode | string | null
): TahunBukuRange {
  const bulanAwal = getBulanAwalTahunBuku(tahunBukuKode);
  const y = parseInt(tanggal.slice(0, 4), 10);
  const m0 = parseInt(tanggal.slice(5, 7), 10) - 1;
  const yAwal = m0 >= bulanAwal ? y : y - 1;
  const from = ymd(yAwal, bulanAwal, 1);
  const yAkhir = bulanAwal === 0 ? yAwal : yAwal + 1;
  const m0Akhir = (bulanAwal + 11) % 12;
  const to = ymd(yAkhir, m0Akhir, new Date(yAkhir, m0Akhir + 1, 0).getDate());
  const label = bulanAwal === 0 ? String(yAwal) : `${yAwal}/${yAkhir}`;
  return { from, to, label };
}
