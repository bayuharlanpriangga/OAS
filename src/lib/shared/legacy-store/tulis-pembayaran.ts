import type { Pembayaran } from "@/types";
import { getLegacyStore } from "./akses-store";

export function writePembayaranList(next: Pembayaran[]): void {
  getLegacyStore()?.setPembayaranList?.(next);
}
