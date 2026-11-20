import type { CounterRecord } from "@/types";
import { parseNomor } from "./parseNomor";

export function counterSetelahPakai(
  counterList: readonly CounterRecord[],
  nomor: string
): CounterRecord[] {
  const p = parseNomor(nomor);
  const list = Array.isArray(counterList) ? counterList : [];
  if (!p) return list as CounterRecord[];
  const id = `${p.jenis}-${p.tahun}`;
  const i = list.findIndex((r) => r && r.id === id);
  if (
    i >= 0 &&
    Number.isInteger(list[i].terakhir) &&
    list[i].terakhir >= p.urut
  ) {
    return list as CounterRecord[];
  }
  const rec: CounterRecord = {
    id,
    jenis: p.jenis,
    tahun: p.tahun,
    terakhir: p.urut,
  };
  const hasil = list.slice();
  if (i >= 0) hasil[i] = rec;
  else hasil.push(rec);
  return hasil;
}
