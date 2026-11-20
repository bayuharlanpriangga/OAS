import type { DokRecord } from "@/types";

export function pesananDariRef(
  daftar: readonly DokRecord[],
  refJenis: string,
  refId: string
): DokRecord | null {
  if (!refJenis || !refId) return null;
  return (
    (Array.isArray(daftar) ? daftar : []).find(
      (d) =>
        d &&
        d.jenis === "pesanan_jual" &&
        d.refJenis === refJenis &&
        d.refId === refId &&
        d.status !== "batal"
    ) || null
  );
}
