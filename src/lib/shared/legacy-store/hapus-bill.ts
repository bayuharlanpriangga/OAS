import { readBillList } from "./baca-bill";
import { simpanBillState } from "./simpan-bill";
import { writeBillList } from "./tulis-bill";

export function hapusBillByIdState(id: string): boolean {
  const prev = readBillList();
  const next = prev.filter((b) => b && b.id !== id);
  if (next.length === prev.length) return false;
  writeBillList(next);
  void simpanBillState();
  return true;
}
