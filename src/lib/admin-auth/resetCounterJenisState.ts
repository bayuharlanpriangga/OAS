import { readCounterList } from "../legacy-store/readCounterList";
import { counterTanpaJenis } from "../penomoran/counterTanpaJenis";
import { syncCounterOnly } from "./syncCounterOnly";

export function resetCounterJenisState(jenis: string): boolean {
  const cur = readCounterList();
  const baru = counterTanpaJenis(cur, jenis);
  if (baru === cur) return false;
  syncCounterOnly(baru);
  return true;
}
