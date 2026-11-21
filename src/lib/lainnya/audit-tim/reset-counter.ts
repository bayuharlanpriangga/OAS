import { readCounterList } from "../../shared/legacy-store/baca-counter";
import { counterTanpaJenis } from "../../shared/penomoran/reset-counter";
import { syncCounterOnly } from "./sinkron-counter";

export function resetCounterJenisState(jenis: string): boolean {
  const cur = readCounterList();
  const baru = counterTanpaJenis(cur, jenis);
  if (baru === cur) return false;
  syncCounterOnly(baru);
  return true;
}
