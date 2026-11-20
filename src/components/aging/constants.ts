import type { AgingBucketName } from "@/types";

export const BUCKET_LABELS: Record<AgingBucketName, string> = {
  lancar: "Belum Jatuh Tempo",
  b0_30: "1–30 Hari",
  b31_60: "31–60 Hari",
  b61_90: "61–90 Hari",
  b90plus: "> 90 Hari",
};
