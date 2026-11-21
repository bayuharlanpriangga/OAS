import { REV_KET_RE } from "./constants";

export function ketTanpaPrefixPembalik(ket: unknown): string {
  return String(ket || "").replace(REV_KET_RE, "");
}
