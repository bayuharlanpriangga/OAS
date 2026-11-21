import type { Produk } from "@/types";
import { getLegacyStore } from "./akses-store";

export function writeProdukList(next: Produk[]): void {
  getLegacyStore()?.setProdukList(next);
}
