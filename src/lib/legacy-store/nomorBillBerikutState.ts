import { nomorBerikut } from "../penomoran/nomorBerikut";
import { readBillList } from "./readBillList";
import { readCounterList } from "./readCounterList";

export function nomorBillBerikutState(tahun?: number): string {
  const y = Number.isInteger(tahun)
    ? (tahun as number)
    : new Date().getFullYear();
  return nomorBerikut(
    "BILL",
    y,
    readBillList().map((b) => b && b.noBill),
    readCounterList()
  );
}
