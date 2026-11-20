import type { DokJenis, DokRecord, TransisiDokResult } from "@/types";
import { DOK_JENIS } from "./constants";

export function transisiDok(
  dok: DokRecord | null | undefined,
  statusBaru: string,
  opsi?: { waktu?: string }
): TransisiDokResult {
  const gagal = (pesan: string): TransisiDokResult => ({ ok: false, pesan });
  if (!dok || typeof dok !== "object") return gagal("Dokumen tidak ditemukan.");
  const J = DOK_JENIS[dok.jenis as DokJenis];
  if (!J) return gagal("Jenis dokumen tidak dikenal.");
  if (!Array.isArray(J.transisi[dok.status])) {
    return gagal("Status dokumen tidak dikenal: " + dok.status + ".");
  }
  const boleh = J.transisi[dok.status];
  if (!boleh.includes(statusBaru)) {
    return gagal(
      boleh.length
        ? `${J.label} berstatus ${dok.status} hanya bisa menjadi: ${boleh.join(", ")}.`
        : `${J.label} berstatus ${dok.status} sudah final dan tidak bisa diubah lagi.`
    );
  }
  const waktu = opsi && typeof opsi.waktu === "string" ? opsi.waktu.trim() : "";
  const entri: { dari: string; ke: string; waktu?: string } = {
    dari: dok.status,
    ke: statusBaru,
  };
  if (waktu) entri.waktu = waktu;
  return {
    ok: true,
    dok: Object.assign({}, dok, {
      status: statusBaru,
      riwayat: (Array.isArray(dok.riwayat) ? dok.riwayat : []).concat([entri]),
    }),
  };
}
