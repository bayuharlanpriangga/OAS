import type { KartuDokInput } from "./types";

export function kartuNama(d: KartuDokInput): string {
  return (
    String(d.pelanggan || d.supplier || d.kontak || "").trim() || "(Tanpa nama)"
  );
}
