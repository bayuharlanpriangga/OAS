import { getLegacyStore } from "./getLegacyStore";

export function readCurrentCompany(): {
  id?: string;
  name?: string;
  type?: string;
  tipe?: string;
} | null {
  return getLegacyStore()?.getCurrentCompany?.() ?? null;
}
