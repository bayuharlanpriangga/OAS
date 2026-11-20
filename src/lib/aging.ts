import type {
  AgingBucketName,
  AgingDokumenInput,
  AgingPerKontak,
  AgingResult,
  AgingSummary,
  Bill,
  JurnalEntry,
  JurnalLine,
  Kontak,
} from "@/types";
import { isJurnalDibalik, isJurnalPembalik } from "./accounting";
import { jurnalBillStatus } from "./bill";

export const AGING_BUCKETS: readonly AgingBucketName[] = [
  "lancar",
  "b0_30",
  "b31_60",
  "b61_90",
  "b90plus",
];

function agingHari(s: unknown): number | null {
  const m =
    typeof s === "string" ? s.trim().match(/^(\d{4})-(\d{2})-(\d{2})/) : null;
  if (!m) return null;
  const y = +m[1];
  const mo = +m[2];
  const d = +m[3];
  const t = Date.UTC(y, mo - 1, d);
  const dt = new Date(t);
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== mo - 1 ||
    dt.getUTCDate() !== d
  ) {
    return null;
  }
  return Math.round(t / 86400000);
}

export function bucketAging(umur: number): AgingBucketName {
  if (umur <= 0) return "lancar";
  if (umur <= 30) return "b0_30";
  if (umur <= 60) return "b31_60";
  if (umur <= 90) return "b61_90";
  return "b90plus";
}

function agingKosong(): AgingSummary {
  return { lancar: 0, b0_30: 0, b31_60: 0, b61_90: 0, b90plus: 0, total: 0 };
}

export function hitungAging<T extends AgingDokumenInput>(
  daftar: readonly T[],
  tanggalAcuan: string
): AgingResult<T> {
  const acuan = agingHari(tanggalAcuan);
  if (acuan === null) {
    throw new TypeError(
      "hitungAging: tanggalAcuan harus berformat YYYY-MM-DD"
    );
  }
  const peta = new Map<string, AgingPerKontak>();
  const total = agingKosong();
  const tidakValid: T[] = [];

  (Array.isArray(daftar) ? daftar : []).forEach((d) => {
    if (!d || typeof d !== "object") return;
    if (d.status === "lunas" || d.status === "draft") return;
    const sisa = Number(d.sisaTagihan);
    if (!(sisa > 0)) return;
    let jt = agingHari(d.jatuhTempo);
    if (jt === null) jt = agingHari(d.tanggal);
    if (jt === null) {
      tidakValid.push(d);
      return;
    }
    const umur = acuan - jt;
    const b = bucketAging(umur);
    const nama =
      String(d.pelanggan || d.supplier || d.kontak || "").trim() ||
      "(Tanpa nama)";
    let k = peta.get(nama);
    if (!k) {
      k = Object.assign({ kontak: nama }, agingKosong(), { dokumen: [] });
      peta.set(nama, k);
    }
    k[b] += sisa;
    k.total += sisa;
    total[b] += sisa;
    total.total += sisa;
    k.dokumen.push({
      no: d.noInvoice || d.noBill || d.no || "",
      jatuhTempo: d.jatuhTempo || d.tanggal,
      sisa,
      umur,
      bucket: b,
    });
  });

  const perKontak = [...peta.values()].sort((a, b) =>
    a.kontak.localeCompare(b.kontak, "id")
  );
  return { tanggalAcuan, perKontak, total, tidakValid };
}

export interface KreditTanpaBillRecord {
  id: string;
  noBill: string;
  supplier: string;
  tanggal: string;
  jatuhTempo: string;
  total: number;
  sisaTagihan: number;
  status: "diterima";
  jurnalNo: string;
}

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
