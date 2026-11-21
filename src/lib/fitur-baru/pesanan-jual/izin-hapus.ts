import type { DokRecord } from "@/types";

export function bolehHapusPesanan(dok: DokRecord | null | undefined): boolean {
  return !!dok && dok.jenis === "pesanan_jual" && dok.status === "draft";
}
