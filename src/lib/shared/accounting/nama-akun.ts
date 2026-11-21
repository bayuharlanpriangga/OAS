import type { Akun } from "@/types";

export function getAkunNama(akuns: readonly Akun[], kode: string): string {
  return akuns.find((a) => a.kode === kode)?.nama || kode;
}
