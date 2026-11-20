import type { Bill } from "@/types";
import { counterSetelahPakai } from "../penomoran/counterSetelahPakai";
import { readBillList } from "./readBillList";
import { readCounterList } from "./readCounterList";
import { simpanBillState } from "./simpanBillState";
import { writeBillList } from "./writeBillList";
import { writeCounterList } from "./writeCounterList";

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
