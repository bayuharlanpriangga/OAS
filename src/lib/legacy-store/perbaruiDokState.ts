import type { DokRecord } from "@/types";
import { readDokList } from "./readDokList";
import { simpanDokState } from "./simpanDokState";
import { writeDokList } from "./writeDokList";

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
