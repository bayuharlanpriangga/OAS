import { readJurnalEntries } from "../legacy-store/readJurnalEntries";

export function isDuplicateKode(kode: string): boolean {
  return readJurnalEntries().some((j) => j.kodeRef === kode);
}
