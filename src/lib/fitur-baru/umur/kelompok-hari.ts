import type { AgingBucketName } from "@/types";

export function bucketAging(umur: number): AgingBucketName {
  if (umur <= 0) return "lancar";
  if (umur <= 30) return "b0_30";
  if (umur <= 60) return "b31_60";
  if (umur <= 90) return "b61_90";
  return "b90plus";
}
