import { nomorBerikut } from "../penomoran/nomor-berikut";
import { readBillList } from "./baca-bill";
import { readCounterList } from "./baca-counter";

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
