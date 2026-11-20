import { readDokList } from "./readDokList";
import { simpanDokState } from "./simpanDokState";
import { writeDokList } from "./writeDokList";

export function hapusDokByIdState(id: string): boolean {
  const prev = readDokList();
  const next = prev.filter((d) => d && d.id !== id);
  if (next.length === prev.length) return false;
  writeDokList(next);
  void simpanDokState();
  return true;
}
