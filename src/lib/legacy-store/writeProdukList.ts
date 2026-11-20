import type { Produk } from "@/types";
import { getLegacyStore } from "./getLegacyStore";

export function writeProdukList(next: Produk[]): void {
  getLegacyStore()?.setProdukList(next);
}
