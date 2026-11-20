import type { AksiDokStatus } from "./types";

export function aksiStatusPenawaran(status: string): AksiDokStatus[] {
  const peta: Record<string, AksiDokStatus[]> = {
    draft: [
      { ke: "terkirim", label: "Kirim", utama: true },
      { ke: "batal", label: "Batalkan", bahaya: true },
    ],
    terkirim: [
      { ke: "disetujui", label: "Disetujui", utama: true },
      { ke: "ditolak", label: "Ditolak", bahaya: true },
      { ke: "batal", label: "Batalkan", bahaya: true },
    ],
    disetujui: [
      { ke: "selesai", label: "Selesai", utama: true },
      { ke: "batal", label: "Batalkan", bahaya: true },
    ],
  };
  return peta[status] || [];
}
