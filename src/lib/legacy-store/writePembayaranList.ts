import type { Pembayaran } from "@/types";
import { getLegacyStore } from "./getLegacyStore";

export function writePembayaranList(next: Pembayaran[]): void {
  getLegacyStore()?.setPembayaranList?.(next);
}
