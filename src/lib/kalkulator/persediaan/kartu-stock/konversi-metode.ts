import { rekalkulasiStorage } from "./rekalkulasi";
import { nextKsId } from "./state";
import type { KsEntry, KsMetode } from "./types";

export function konversiMetodeRows(
  sumber: readonly KsEntry[],
  tujuan: readonly KsEntry[],
  keMetode: KsMetode,
  mode: "gabung" | "timpa"
): KsEntry[] {
  const masukSumber = (sumber || [])
    .filter((e) => e.mQty > 0)
    .map((e) => ({ ...e, id: "conv_" + Date.now() + "_" + nextKsId() }));
  const base =
    mode === "gabung"
      ? (tujuan || []).filter((e) => e.mQty > 0).map((e) => ({ ...e }))
      : [];
  const merged = [...base, ...masukSumber].sort((a, b) =>
    (a.tgl || "").localeCompare(b.tgl || "")
  );
  return rekalkulasiStorage(merged, keMetode);
}
