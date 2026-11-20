import { KODE_COUNTER_KEY } from "./constants";
import { getKodeCounter } from "./getKodeCounter";

export function nextKode(prefix: string): string {
  const counters = getKodeCounter();
  const year = new Date().getFullYear();
  const key = `${prefix}-${year}`;
  counters[key] = (counters[key] || 0) + 1;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(KODE_COUNTER_KEY, JSON.stringify(counters));
  }
  return `${prefix}-${year}-${String(counters[key]).padStart(3, "0")}`;
}
