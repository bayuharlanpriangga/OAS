import type { Bill } from "@/types";
import { counterSetelahPakai } from "../penomoran/update-counter";
import { readBillList } from "./baca-bill";
import { readCounterList } from "./baca-counter";
import { simpanBillState } from "./simpan-bill";
import { writeBillList } from "./tulis-bill";
import { writeCounterList } from "./tulis-counter";

export function perbaruiBillState(bill: Bill): boolean {
  if (!bill || typeof bill !== "object") return false;
  const list = readBillList().slice();
  const i = list.findIndex((b) => b && b.id === bill.id);
  if (i < 0) return false;
  list[i] = bill;
  writeBillList(list);
  const nextCounter = counterSetelahPakai(readCounterList(), bill.noBill);
  writeCounterList(nextCounter);
  void simpanBillState();
  return true;
}
