import { readBillList } from "./readBillList";
import { simpanBillState } from "./simpanBillState";
import { writeBillList } from "./writeBillList";

export function hapusBillByIdState(id: string): boolean {
  const prev = readBillList();
  const next = prev.filter((b) => b && b.id !== id);
  if (next.length === prev.length) return false;
  writeBillList(next);
  void simpanBillState();
  return true;
}
