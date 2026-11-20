import { KODE_COUNTER_KEY } from "./constants";

export function getKodeCounter(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(
      window.localStorage.getItem(KODE_COUNTER_KEY) || "{}"
    ) as Record<string, number>;
  } catch {
    return {};
  }
}
