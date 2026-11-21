import type { ParsedNomor } from "@/types";

export function parseNomor(no: unknown): ParsedNomor | null {
  const m =
    typeof no === "string"
      ? no
          .trim()
          .toUpperCase()
          .match(/^([A-Z0-9]+)-(\d{4})-(\d{1,9})$/)
      : null;
  return m
    ? {
        jenis: m[1],
        tahun: parseInt(m[2], 10),
        urut: parseInt(m[3], 10),
      }
    : null;
}
