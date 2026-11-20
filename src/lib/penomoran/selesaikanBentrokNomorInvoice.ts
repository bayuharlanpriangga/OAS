import type {
  BentrokNomorItem,
  CounterRecord,
  Invoice,
  SelesaikanBentrokResult,
} from "@/types";
import { counterSetelahPakai } from "./counterSetelahPakai";
import { nomorBerikut } from "./nomorBerikut";
import { parseNomor } from "./parseNomor";

export function selesaikanBentrokNomorInvoice<T extends Invoice>(
  invoices: readonly T[],
  counters: readonly CounterRecord[]
): SelesaikanBentrokResult<T> {
  if (!Array.isArray(invoices) || invoices.length <= 1) {
    return {
      invoices: Array.isArray(invoices) ? invoices.slice() : [],
      bentrok: [],
      counterList: Array.isArray(counters) ? counters.slice() : [],
    };
  }

  const byNo = new Map<string, T[]>();
  invoices.forEach((inv) => {
    const no =
      (inv && inv.noInvoice && String(inv.noInvoice).trim().toUpperCase()) ||
      "";
    if (!no) return;
    if (!byNo.has(no)) byNo.set(no, []);
    byNo.get(no)!.push(inv);
  });

  let adaBentrok = false;
  byNo.forEach((list) => {
    if (list.length > 1) adaBentrok = true;
  });
  if (!adaBentrok) {
    return {
      invoices: invoices.slice(),
      bentrok: [],
      counterList: Array.isArray(counters) ? counters.slice() : [],
    };
  }

  let curCounters = Array.isArray(counters) ? counters.slice() : [];
  const hasilInvoices = invoices.map((inv) => ({ ...inv }));
  const semuaNomor = new Set(
    hasilInvoices
      .map(
        (i) => i && i.noInvoice && String(i.noInvoice).trim().toUpperCase()
      )
      .filter((x): x is string => Boolean(x))
  );

  const daftarBentrok: BentrokNomorItem[] = [];

  byNo.forEach((list, no) => {
    if (list.length <= 1) return;
    const p = parseNomor(no);
    if (!p) return;

    const sorted = list.slice().sort((a, b) => {
      const ta = (a && a.createdAt) || "";
      const tb = (b && b.createdAt) || "";
      if (ta !== tb) return ta < tb ? -1 : 1;
      const ida = (a && a.id) || "";
      const idb = (b && b.id) || "";
      return ida < idb ? -1 : 1;
    });

    for (let k = 1; k < sorted.length; k++) {
      const targetInv = sorted[k];
      const targetId = targetInv.id;
      const targetIdx = hasilInvoices.findIndex((i) => i.id === targetId);
      if (targetIdx < 0) continue;

      const noBaru = nomorBerikut(
        p.jenis,
        p.tahun,
        Array.from(semuaNomor),
        curCounters
      );
      semuaNomor.add(noBaru);
      curCounters = counterSetelahPakai(curCounters, noBaru);

      daftarBentrok.push({
        id: targetId,
        noLama: targetInv.noInvoice,
        noBaru,
        pelanggan: targetInv.pelanggan || "-",
      });

      hasilInvoices[targetIdx].noInvoice = noBaru;
    }
  });

  return {
    invoices: hasilInvoices,
    bentrok: daftarBentrok,
    counterList: curCounters,
  };
}
