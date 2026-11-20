import type { Bill, JurnalEntry, JurnalLine, Kontak } from "@/types";
import { isJurnalDibalik } from "../accounting/isJurnalDibalik";
import { isJurnalPembalik } from "../accounting/isJurnalPembalik";
import type { KreditTanpaBillRecord } from "./types";

export function pembelianKreditTanpaBill(
  daftarBill: readonly Bill[],
  daftarJurnal: readonly JurnalEntry[],
  kontakList?: readonly Kontak[]
): KreditTanpaBillRecord[] {
  const bills = (Array.isArray(daftarBill) ? daftarBill : []).filter(
    (b) => b && typeof b === "object"
  );
  const jurnal = Array.isArray(daftarJurnal) ? daftarJurnal : [];
  const noBillSet = new Set<string>();
  bills.forEach((b) => {
    if (b.noBill) noBillSet.add(String(b.noBill).toLowerCase());
    if (b.jurnalNo) noBillSet.add(String(b.jurnalNo).toLowerCase());
  });

  const extraKredit: KreditTanpaBillRecord[] = [];
  jurnal.forEach((j) => {
    if (!j || j.jenis !== "Pembelian") return;
    if (isJurnalPembalik(j)) return;
    if (isJurnalDibalik(j, jurnal)) return;
    if (j.no && noBillSet.has(j.no.toLowerCase())) return;
    if (j.ref && noBillSet.has(j.ref.toLowerCase())) return;

    const lines: readonly JurnalLine[] = Array.isArray(j.lines) ? j.lines : [];
    const utangLine = lines.find(
      (l) => l && l.kredit > 0 && String(l.akun).startsWith("21")
    );
    if (!utangLine) return;

    let sup = "Supplier Umum";
    if (j.kontakId && Array.isArray(kontakList)) {
      const k = kontakList.find((x) => x && x.id === j.kontakId);
      if (k && k.nama) sup = k.nama;
    }
    if (sup === "Supplier Umum" && j.ket) {
      const parts = j.ket.split("—");
      if (parts.length > 1 && parts[1].trim()) sup = parts[1].trim();
    }

    extraKredit.push({
      id: "jrn_kredit_" + (j._id || j.no || ""),
      noBill: j.ref || j.no || "",
      supplier: sup,
      tanggal: j.tanggal,
      jatuhTempo: j.tanggal,
      total: utangLine.kredit,
      sisaTagihan: utangLine.kredit,
      status: "diterima",
      jurnalNo: j.no || "",
    });
  });

  return extraKredit;
}
