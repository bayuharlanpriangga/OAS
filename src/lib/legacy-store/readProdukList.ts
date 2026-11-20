import type { Produk } from "@/types";
import { getLegacyStore } from "./getLegacyStore";

export function readProdukList(): Produk[] {
  return getLegacyStore()?.getProdukList() ?? [];
}
