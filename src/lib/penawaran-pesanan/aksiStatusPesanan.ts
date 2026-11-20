import type { AksiDokStatus } from "./types";

export function aksiStatusPesanan(status: string): AksiDokStatus[] {
  const peta: Record<string, AksiDokStatus[]> = {
    draft: [
      { ke: "dikonfirmasi", label: "Konfirmasi", utama: true },
      { ke: "batal", label: "Batalkan", bahaya: true },
    ],
    dikonfirmasi: [
      { ke: "selesai", label: "Selesai", utama: true },
      { ke: "batal", label: "Batalkan", bahaya: true },
    ],
    sebagian: [
      { ke: "selesai", label: "Selesai", utama: true },
      { ke: "batal", label: "Batalkan", bahaya: true },
    ],
  };
  return peta[status] || [];
}
