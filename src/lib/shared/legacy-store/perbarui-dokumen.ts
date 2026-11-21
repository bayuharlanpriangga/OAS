import type { DokRecord } from "@/types";
import { readDokList } from "./baca-dokumen";
import { simpanDokState } from "./simpan-dokumen";
import { writeDokList } from "./tulis-dokumen";

export function perbaruiDokState(dok: DokRecord): boolean {
  if (!dok || typeof dok !== "object") return false;
  const list = readDokList().slice();
  const i = list.findIndex((d) => d && d.id === dok.id);
  if (i < 0) return false;
  list[i] = dok;
  writeDokList(list);
  void simpanDokState();
  return true;
}
