import { readAkuns } from "../../shared/legacy-store/baca-akun";
import { readJurnalEntries } from "../../shared/legacy-store/baca-jurnal";
import { buildOasAppContextPure } from "./konteks-aplikasi";
import type { OasAppContext } from "./types";

export function gatherOasAppContext(): OasAppContext {
  return buildOasAppContextPure(readAkuns(), readJurnalEntries());
}
