import type { AgingResult } from "@/types";
import { agingCsvCell } from "./agingCsvCell";

export function agingCsv(
  hasil: AgingResult,
  kolomKontak = "Pelanggan"
): string {
  const head = [
    kolomKontak,
    "Belum Jatuh Tempo",
    "1-30 Hari",
    "31-60 Hari",
    "61-90 Hari",
    "> 90 Hari",
    "Total",
  ];
  const rows = hasil.perKontak.map((k) => [
    k.kontak,
    k.lancar,
    k.b0_30,
    k.b31_60,
    k.b61_90,
    k.b90plus,
    k.total,
  ]);
  const t = hasil.total;
  rows.push([
    "TOTAL",
    t.lancar,
    t.b0_30,
    t.b31_60,
    t.b61_90,
    t.b90plus,
    t.total,
  ]);
  return (
    "\uFEFF" +
    [head]
      .concat(rows as string[][])
      .map((r) => r.map(agingCsvCell).join(","))
      .join("\r\n")
  );
}
