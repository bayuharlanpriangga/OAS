import type { Bill } from "@/types";
import { counterSetelahPakai } from "../penomoran/update-counter";
import { readBillList } from "./baca-bill";
import { readCounterList } from "./baca-counter";
import { simpanBillState } from "./simpan-bill";
import { writeBillList } from "./tulis-bill";
import { writeCounterList } from "./tulis-counter";

export function tambahBillState(bill: Bill): Promise<boolean> {
  const next = [bill, ...readBillList()];
  writeBillList(next);
  const nextCounter = counterSetelahPakai(readCounterList(), bill.noBill);
  writeCounterList(nextCounter);
  return simpanBillState();
}
