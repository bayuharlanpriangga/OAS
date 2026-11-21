import type { Bill, JurnalEntry, Kontak } from "@/types";
import { pembelianKreditTanpaBill } from "../umur/kredit-tanpa-bill";
import { jurnalBillStatus } from "../tagihan-beli/status-jurnal";
import type { KartuDokInput } from "./types";

export function dokumenHutangKartu(
  daftarBill: readonly Bill[],
  daftarJurnal: readonly JurnalEntry[],
  kontakList?: readonly Kontak[]
): KartuDokInput[] {
  const bills = (Array.isArray(daftarBill) ? daftarBill : []).filter(
    (b) => b && typeof b === "object"
  );
  const jurnal = Array.isArray(daftarJurnal) ? daftarJurnal : [];
  const validBills = bills.filter(
    (b) =>
      b.status !== "draft" && jurnalBillStatus(b, jurnal, bills).status !== "dibalik"
  );
  const extra = pembelianKreditTanpaBill(bills, jurnal, kontakList);
  return extra.length
    ? (validBills as KartuDokInput[]).concat(extra)
    : (validBills as KartuDokInput[]);
}
