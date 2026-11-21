import type { Produk } from "@/types";
import { getLegacyStore } from "./akses-store";

export function readProdukList(): Produk[] {
  return getLegacyStore()?.getProdukList() ?? [];
}
