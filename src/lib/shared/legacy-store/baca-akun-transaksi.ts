import type { TransaksiAkunSettings } from "@/types";
import { getLegacyStore } from "./akses-store";

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
