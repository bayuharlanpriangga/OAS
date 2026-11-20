import type { Bill } from "@/types";
import { counterSetelahPakai } from "../penomoran/counterSetelahPakai";
import { readBillList } from "./readBillList";
import { readCounterList } from "./readCounterList";
import { simpanBillState } from "./simpanBillState";
import { writeBillList } from "./writeBillList";
import { writeCounterList } from "./writeCounterList";

export function tambahBillState(bill: Bill): Promise<boolean> {
  const next = [bill, ...readBillList()];
  writeBillList(next);
  const nextCounter = counterSetelahPakai(readCounterList(), bill.noBill);
  writeCounterList(nextCounter);
  return simpanBillState();
}
