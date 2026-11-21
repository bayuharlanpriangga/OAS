import { readDokList } from "./baca-dokumen";
import { simpanDokState } from "./simpan-dokumen";
import { writeDokList } from "./tulis-dokumen";

export function hapusDokByIdState(id: string): boolean {
  const prev = readDokList();
  const next = prev.filter((d) => d && d.id !== id);
  if (next.length === prev.length) return false;
  writeDokList(next);
  void simpanDokState();
  return true;
}
