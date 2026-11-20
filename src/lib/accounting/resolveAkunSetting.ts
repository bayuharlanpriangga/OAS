import type { TransaksiAkunSettings } from "@/types";

export function resolveAkunSetting(
  settings: TransaksiAkunSettings | null | undefined,
  kategori: "jual" | "beli",
  kodeDefault: string
): string {
  const map = settings?.[kategori];
  const v = map && map[kodeDefault];
  return v || kodeDefault;
}
