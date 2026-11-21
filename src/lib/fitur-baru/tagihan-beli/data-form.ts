import type { Bill, BillFormInput } from "@/types";
import { PPN_TARIF_STANDAR } from "../../shared/accounting/constants";

export function formDariBill(
  bill: Bill | null | undefined
): BillFormInput & { ppnAktif: boolean; ppnTarif: number } {
  const b = bill && typeof bill === "object" ? bill : ({} as Partial<Bill>);
  const aktif =
    typeof b.ppnTarif === "number" && isFinite(b.ppnTarif) && b.ppnTarif > 0;
  return {
    id: b.id || "",
    noBill: b.noBill || "",
    supplier: b.supplier || "",
    tanggal: b.tanggal || "",
    jatuhTempo: b.jatuhTempo || "",
    deskripsi: b.deskripsi || "",
    items: (Array.isArray(b.items) ? b.items : [])
      .filter((it) => it && typeof it === "object")
      .map((it) => ({
        nama: it.nama || "",
        qty: it.qty,
        harga: it.harga,
        akun: it.akun || "",
      })),
    ppnAktif: aktif,
    ppnTarif: aktif ? (b.ppnTarif as number) : PPN_TARIF_STANDAR,
    akunUtang: b.akunUtang || "",
    createdAt: b.createdAt || "",
  };
}
