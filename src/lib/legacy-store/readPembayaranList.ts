import type { Pembayaran } from "@/types";
import { getLegacyStore } from "./getLegacyStore";

export function readPembayaranList(): Pembayaran[] {
  return getLegacyStore()?.getPembayaranList?.() ?? [];
}
