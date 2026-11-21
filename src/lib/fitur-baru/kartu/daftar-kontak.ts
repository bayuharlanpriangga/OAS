import { kartuNama } from "./nama-kontak";
import type { KartuDokInput } from "./types";

export function daftarKontakKartu(
  daftarDok: readonly KartuDokInput[]
): string[] {
  const set = new Set<string>();
  (Array.isArray(daftarDok) ? daftarDok : []).forEach((d) => {
    if (!d || typeof d !== "object" || d.status === "draft") return;
    if (!(typeof d.total === "number" && isFinite(d.total) && d.total > 0)) {
      return;
    }
    set.add(kartuNama(d));
  });
  return [...set].sort((a, b) => a.localeCompare(b, "id"));
}
