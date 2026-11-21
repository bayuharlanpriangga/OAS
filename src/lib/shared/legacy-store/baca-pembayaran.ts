import type { Pembayaran } from "@/types";
import { getLegacyStore } from "./akses-store";

export function readPembayaranList(): Pembayaran[] {
  return getLegacyStore()?.getPembayaranList?.() ?? [];
}
