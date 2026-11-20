import type { Akun, AkunTrashItem } from "@/types";
import { escapeHtml } from "../format";

export function formatAkunNamaTampil(
  kode: string,
  akuns: readonly Akun[],
  akunsTrash: readonly AkunTrashItem[] = []
): string {
  const found = akuns.find((x) => x.kode === kode);
  if (found) return escapeHtml(found.nama);
  const diTrash = akunsTrash.find((x) => x.kode === kode);
  const label = diTrash
    ? `Akun tidak ditemukan (${escapeHtml(kode)} — di Sampah COA)`
    : `Akun tidak ditemukan (${escapeHtml(kode)})`;
  return `<span style="color:var(--red);" title="${label}"><i class="ti ti-alert-triangle" style="font-size:11px;vertical-align:-1px;"></i> ${label}</span>`;
}
