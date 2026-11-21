import type { DokRecord } from "@/types";

export function idDokBaru(
  daftar?: readonly DokRecord[],
  waktuMs: number = Date.now()
): string {
  const ada = new Set(
    (Array.isArray(daftar) ? daftar : []).map((d) => d && d.id)
  );
  const dasar =
    "DOK_" + (Number.isFinite(waktuMs) ? Math.floor(waktuMs) : Date.now());
  let id = dasar;
  let n = 1;
  while (ada.has(id)) {
    n++;
    id = dasar + "_" + n;
  }
  return id;
}
