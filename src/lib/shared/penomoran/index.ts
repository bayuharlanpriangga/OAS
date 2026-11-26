import type { ParsedNomor, CounterRecord, BentrokNomorItem, Invoice, SelesaikanBentrokResult } from "@/types";

export function parseNomor(no: unknown): ParsedNomor | null {
  const m =
    typeof no === "string"
      ? no
          .trim()
          .toUpperCase()
          .match(/^([A-Z0-9]+)-(\d{4})-(\d{1,9})$/)
      : null;
  return m
    ? {
        jenis: m[1],
        tahun: parseInt(m[2], 10),
        urut: parseInt(m[3], 10),
      }
    : null;
}

export function nomorBerikut(
  jenis: string,
  tahun: number,
  daftarNomor?: readonly (string | null | undefined)[] | null,
  counterList?: readonly CounterRecord[] | null
): string {
  if (typeof jenis !== "string" || !/^[A-Za-z0-9]+$/.test(jenis)) {
    throw new TypeError(
      "nomorBerikut: jenis harus berupa huruf/angka tanpa spasi atau tanda hubung"
    );
  }
  if (!Number.isInteger(tahun) || tahun < 1000 || tahun > 9999) {
    throw new TypeError("nomorBerikut: tahun harus bilangan bulat 4 digit");
  }
  const J = jenis.toUpperCase();
  let maks = 0;
  (Array.isArray(daftarNomor) ? daftarNomor : []).forEach((no) => {
    const p = parseNomor(no);
    if (p && p.jenis === J && p.tahun === tahun && p.urut > maks) {
      maks = p.urut;
    }
  });
  const id = `${J}-${tahun}`;
  (Array.isArray(counterList) ? counterList : []).forEach((r) => {
    if (r && r.id === id && Number.isInteger(r.terakhir) && r.terakhir > maks) {
      maks = r.terakhir;
    }
  });
  return `${id}-${String(maks + 1).padStart(3, "0")}`;
}

export function counterSetelahPakai(
  counterList: readonly CounterRecord[],
  nomor: string
): CounterRecord[] {
  const p = parseNomor(nomor);
  const list = Array.isArray(counterList) ? counterList : [];
  if (!p) return list as CounterRecord[];
  const id = `${p.jenis}-${p.tahun}`;
  const i = list.findIndex((r) => r && r.id === id);
  if (
    i >= 0 &&
    Number.isInteger(list[i].terakhir) &&
    list[i].terakhir >= p.urut
  ) {
    return list as CounterRecord[];
  }
  const rec: CounterRecord = {
    id,
    jenis: p.jenis,
    tahun: p.tahun,
    terakhir: p.urut,
  };
  const hasil = list.slice();
  if (i >= 0) hasil[i] = rec;
  else hasil.push(rec);
  return hasil;
}

export function counterTanpaJenis(
  counterList: readonly CounterRecord[],
  jenis: string
): CounterRecord[] {
  const list = Array.isArray(counterList) ? counterList : [];
  const J = String(jenis || "").toUpperCase();
  if (!J) return list as CounterRecord[];
  const hasil = list.filter(
    (r) =>
      !(
        r &&
        typeof r.id === "string" &&
        r.id.toUpperCase().startsWith(J + "-")
      )
  );
  return hasil.length === list.length ? (list as CounterRecord[]) : hasil;
}

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
