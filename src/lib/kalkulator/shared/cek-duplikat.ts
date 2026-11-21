import { readJurnalEntries } from "../../shared/legacy-store/baca-jurnal";

export function isDuplicateKode(kode: string): boolean {
  return readJurnalEntries().some((j) => j.kodeRef === kode);
}
