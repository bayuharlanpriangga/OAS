import type { Bill, JurnalEntry, Kontak } from "@/types";
import { jurnalBillStatus } from "../bill/jurnalBillStatus";
import { pembelianKreditTanpaBill } from "./pembelianKreditTanpaBill";
import type { KreditTanpaBillRecord } from "./types";

export function billUntukAging(
  daftarBill: readonly Bill[],
  daftarJurnal: readonly JurnalEntry[],
  kontakList?: readonly Kontak[]
): Array<Bill | KreditTanpaBillRecord> {
  const bills = (Array.isArray(daftarBill) ? daftarBill : []).filter(
    (b) => b && typeof b === "object"
  );
  const jurnal = Array.isArray(daftarJurnal) ? daftarJurnal : [];
  const aktifBills = bills.filter(
    (b) =>
      (b.status === "diterima" || b.status === "sebagian") &&
      jurnalBillStatus(b, jurnal, bills).status !== "dibalik"
  );
  const extraKredit = pembelianKreditTanpaBill(bills, jurnal, kontakList);
  return extraKredit.length
    ? (aktifBills as Array<Bill | KreditTanpaBillRecord>).concat(extraKredit)
    : aktifBills;
}
