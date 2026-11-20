import type { TransaksiAkunSettings } from "@/types";
import { getLegacyStore } from "./getLegacyStore";

export function readTransaksiAkunSettings(): TransaksiAkunSettings {
  return (
    getLegacyStore()?.getTransaksiAkunSettings?.() ?? {
      jual: {},
      beli: {},
      jualHpp: "",
      jualPersediaan: "",
    }
  );
}
