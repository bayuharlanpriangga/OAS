import { readAkuns } from "../legacy-store/readAkuns";
import { readJurnalEntries } from "../legacy-store/readJurnalEntries";
import { buildOasAppContextPure } from "./buildOasAppContextPure";
import type { OasAppContext } from "./types";

export function gatherOasAppContext(): OasAppContext {
  return buildOasAppContextPure(readAkuns(), readJurnalEntries());
}
