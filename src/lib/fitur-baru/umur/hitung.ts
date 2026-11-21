import type {
  AgingDokumenInput,
  AgingPerKontak,
  AgingResult,
  AgingSummary,
} from "@/types";
import { bucketAging } from "./kelompok-hari";

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
