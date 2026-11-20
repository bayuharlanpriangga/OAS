import type { DokJenis } from "@/types";
import { DOK_JENIS } from "./constants";

export function dokStatusBerikut(jenis: DokJenis, status: string): string[] {
  const J = DOK_JENIS[jenis];
  return J && Array.isArray(J.transisi[status])
    ? J.transisi[status].slice()
    : [];
}
