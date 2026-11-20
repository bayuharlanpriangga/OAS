import type { KsMetode } from "./types";

export const KS_METODE_DIAKUI: readonly KsMetode[] = ["fifo", "wa", "mwa"];

export const KS_METODE_LABEL: Record<KsMetode, string> = {
  fifo: "FIFO (Masuk Pertama Keluar Pertama)",
  wa: "Weighted Average (Rata-rata Tertimbang)",
  mwa: "Moving Weighted Average (Rata-rata Bergerak)",
  lifo: "LIFO (Data Lama — Non-PSAK 14)",
};
