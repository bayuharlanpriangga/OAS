import { JENIS_JURNAL } from "./accounting";
import { escapeHtml, fmtRp } from "./format";
import { callOasGlobal } from "./legacy-actions";
import {
  readJurnalEntries,
  setLegacyKartuStockTab,
  setOasWindowFn,
} from "./legacy-store";
import type { JurnalEntry } from "@/types";

const KODE_COUNTER_KEY = "oas_kode_counters";

interface LastKalkInputState {
  kode: string;
  jurnalIndices: number[];
}

let lastKalkInput: LastKalkInputState | null = null;
let slideStyleInjected = false;

function ensureSlideStyle(): void {
  if (typeof document === "undefined" || slideStyleInjected) return;
  slideStyleInjected = true;
  const style = document.createElement("style");
  style.textContent =
    "@keyframes slideUp { from{transform:translateX(-50%) translateY(20px);opacity:0} to{transform:translateX(-50%) translateY(0);opacity:1} }";
  document.head.appendChild(style);
}

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

export function isDuplicateKode(kode: string): boolean {
  return readJurnalEntries().some((j) => j.kodeRef === kode);
}

export function checkAndInputKalkulator(
  kode: string,
  jurnals: JurnalEntry[],
  successMsg: string,
  onSuccess?: (kode: string) => void
): void {
  if (isDuplicateKode(kode)) {
    if (
      !window.confirm(
        `Kode "${kode}" sudah pernah diinput sebelumnya!\n\nApakah kamu yakin ingin input ulang? (Bisa menyebabkan jurnal ganda)`
      )
    ) {
      return;
    }
  }
  const terkunci = jurnals.find((j) =>
    Boolean(callOasGlobal("isPeriodeTerkunci", j.tanggal))
  );
  if (terkunci) {
    callOasGlobal("guardPeriode", terkunci.tanggal, "diposting");
    return;
  }
  jurnals.forEach((j) => {
    j.kodeRef = kode;
    callOasGlobal("addJurnal", j);
  });
  callOasGlobal("renderDashboard");
  callOasGlobal(
    "showAlert",
    `<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> ${successMsg} [${kode}]`
  );
  if (onSuccess) onSuccess(kode);
}

export function undoLastKalkInput(): void {
  if (!lastKalkInput) {
    callOasGlobal("showAlert", "Tidak ada input yang bisa di-undo");
    return;
  }
  const { kode, jurnalIndices } = lastKalkInput;
  if (
    !window.confirm(
      `Batalkan jurnal dari "${kode}"?\n\nJurnal asli tidak dihapus: sistem membuat jurnal pembalik bertanggal hari ini.`
    )
  ) {
    return;
  }
  const entries = readJurnalEntries();
  const asal = jurnalIndices.map((i) => entries[i]).filter(Boolean);
  let dibalik = 0;
  try {
    asal.forEach((e) => {
      if (
        callOasGlobal("buatJurnalPembalik", e, {
          alasan: `Undo input kalkulator ${kode}`,
        })
      ) {
        dibalik++;
      }
    });
  } catch (err) {
    const win = window as unknown as {
      PeriodeTerkunciError?: new (...args: unknown[]) => Error;
    };
    if (!win.PeriodeTerkunciError || !(err instanceof win.PeriodeTerkunciError)) {
      throw err;
    }
  }
  if (!dibalik) return;
  lastKalkInput = null;
  callOasGlobal("renderDashboard");
  callOasGlobal("renderJurnalUmum");
  callOasGlobal(
    "showAlert",
    `<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Input "${kode}" dibatalkan lewat ${dibalik} jurnal pembalik`
  );
  document.querySelectorAll<HTMLElement>(".kalk-undo-btn").forEach((b) => {
    b.style.display = "none";
  });
}

export function showKalkUndoBar(label: string, kode: string): void {
  if (typeof document === "undefined") return;
  ensureSlideStyle();
  document.querySelectorAll(".kalk-undo-bar").forEach((b) => b.remove());

  const bar = document.createElement("div");
  bar.className = "kalk-undo-bar";
  bar.style.cssText = `
    position:fixed;bottom:80px;left:50%;transform:translateX(-50%);
    background:var(--surface);border:1px solid var(--accent);border-radius:10px;
    padding:10px 16px;display:flex;align-items:center;gap:12px;
    z-index:500;box-shadow:0 8px 32px rgba(0,0,0,0.4);font-size:13px;
    animation:slideUp 0.3s ease;max-width:90vw;
  `;
  bar.innerHTML = `
    <span style="color:var(--accent)"><i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i></span>
    <span style="color:var(--text);flex:1">${escapeHtml(label)} <span style="color:var(--muted);font-size:11px;font-family:var(--mono);">[${escapeHtml(kode)}]</span></span>
    <button type="button" data-action="undo" style="background:rgba(248,113,113,0.15);border:1px solid rgba(248,113,113,0.3);border-radius:6px;padding:5px 12px;cursor:pointer;color:var(--red);font-size:12px;font-family:var(--sans);font-weight:600;flex-shrink:0;">↩ Undo</button>
    <button type="button" data-action="view" style="background:rgba(74,222,128,0.1);border:1px solid rgba(74,222,128,0.25);border-radius:6px;padding:5px 12px;cursor:pointer;color:var(--accent);font-size:12px;font-family:var(--sans);font-weight:600;flex-shrink:0;"><i class="ti ti-book" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> Lihat</button>
    <button type="button" data-action="close" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:16px;padding:0 4px;flex-shrink:0;">✕</button>
  `;
  bar.querySelector('[data-action="undo"]')?.addEventListener("click", () => {
    undoLastKalkInput();
    bar.remove();
  });
  bar.querySelector('[data-action="view"]')?.addEventListener("click", () => {
    callOasGlobal("showPage", "jurnal-umum");
    bar.remove();
  });
  bar.querySelector('[data-action="close"]')?.addEventListener("click", () => {
    bar.remove();
  });
  document.body.appendChild(bar);
  window.setTimeout(() => {
    if (bar.parentNode) bar.remove();
  }, 12000);
}

function readInputVal(id: string): string {
  const el = document.getElementById(id) as
    | HTMLInputElement
    | HTMLSelectElement
    | null;
  return el?.value ?? "";
}

export function inputPenyusutanJurnal(): void {
  const cost = parseFloat(readInputVal("py-cost")) || 0;
  const umur = parseInt(readInputVal("py-umur"), 10) || 0;
  const nama = readInputVal("py-nama") || "Aset Tetap";
  const metode = readInputVal("py-metode");

  if (!cost || !umur) {
    callOasGlobal("showAlert", "Hitung penyusutan dulu!");
    return;
  }

  const rows = document.querySelectorAll("#py-tabel-body tr");
  if (!rows.length) {
    callOasGlobal("showAlert", 'Klik "Hitung & Generate Tabel" dulu!');
    return;
  }

  const inputModalPromise = callOasGlobal("showCustomInputModal", {
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent3)"><path d="M3 21h18M9 21V7l6-4v18M3 21V11l6-4"/></svg>',
    iconColor: "rgba(74,222,128,0.15)",
    iconBorder: "rgba(74,222,128,0.3)",
    title: "Input Jurnal Penyusutan",
    subtitle: "Pilih tahun penyusutan yang ingin diinput ke jurnal",
    rows: [
      { label: "Nama Aset", value: nama || "—", color: "var(--text)" },
      { label: "Umur Ekonomis", value: `${umur} tahun`, color: "var(--accent2)" },
    ],
    inputLabel: `Tahun ke berapa yang ingin diinput? (1 – ${umur}):`,
    inputDefault: 1,
    btnLabel: "✓ Lanjut Pilih Akun",
  }) as Promise<string | null> | undefined;

  if (!inputModalPromise?.then) return;

  inputModalPromise.then((tahunVal) => {
    if (tahunVal === null) return;
    const t = parseInt(tahunVal, 10);
    if (t < 1 || t > umur) {
      callOasGlobal("showAlert", "Tahun tidak valid");
      return;
    }

    const row = rows[t - 1];
    if (!row) {
      callOasGlobal("showAlert", "Data baris tidak ditemukan");
      return;
    }
    const tds = row.querySelectorAll("td");
    const beban =
      parseFloat((tds[1]?.textContent || "").replace(/[^0-9]/g, "")) || 0;
    if (!beban) {
      callOasGlobal("showAlert", "Nilai penyusutan tidak valid");
      return;
    }

    const kode = nextKode("DEP");
    const today = new Date().toISOString().split("T")[0];

    const akunMap: Record<string, [string, string, string]> = {
      bangunan: ["1703", "6301", "Bangunan"],
      kendaraan: ["1712", "6302", "Kendaraan"],
      peralatan: ["1722", "6303", "Peralatan Kantor"],
      mesin: ["1732", "6304", "Mesin & Alat Produksi"],
      komputer: ["1752", "6305", "Komputer & Laptop"],
      inventaris: ["1742", "6303", "Inventaris & Furnitur"],
    };

    const selectModalPromise = callOasGlobal("showCustomSelectModal", {
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/></svg>',
      iconColor: "rgba(34,211,238,0.15)",
      iconBorder: "rgba(34,211,238,0.3)",
      title: "Pilih Jenis Aset",
      subtitle: `Penyusutan Tahun ke-${t} — ${fmtRp(beban)}`,
      options: [
        { value: "bangunan", label: "Bangunan", sub: "Akun 1702/1703 ↔ 6301" },
        { value: "kendaraan", label: "Kendaraan", sub: "Akun 1711/1712 ↔ 6302" },
        {
          value: "peralatan",
          label: "Peralatan Kantor",
          sub: "Akun 1721/1722 ↔ 6303",
        },
        {
          value: "mesin",
          label: "Mesin & Alat Produksi",
          sub: "Akun 1731/1732 ↔ 6304",
        },
        {
          value: "komputer",
          label: "Komputer & Laptop",
          sub: "Akun 1751/1752 ↔ 6305",
        },
        {
          value: "inventaris",
          label: "Inventaris & Furnitur",
          sub: "Akun 1741/1742 ↔ 6303",
        },
      ],
      btnLabel: "✓ Input Jurnal Penyusutan",
    }) as Promise<string | null> | undefined;

    if (!selectModalPromise?.then) return;

    selectModalPromise.then((pilihan) => {
      if (pilihan === null) return;
      const [akumKode, bebanKode] = akunMap[pilihan] || akunMap.kendaraan;
      const akumNama = String(
        callOasGlobal("getAkunNama", akumKode) || akumKode
      );
      const bebanNama = String(
        callOasGlobal("getAkunNama", bebanKode) || bebanKode
      );

      const jurnal: JurnalEntry = {
        tanggal: today,
        ket: `Penyusutan ${nama} Tahun ke-${t} [${metode}]`,
        jenis: JENIS_JURNAL.PENYUSUTAN,
        kodeRef: kode,
        lines: [
          { akun: bebanKode, ket: bebanNama, debit: beban, kredit: 0 },
          { akun: akumKode, ket: akumNama, debit: 0, kredit: beban },
        ],
      };

      const beforeCount = readJurnalEntries().length;
      checkAndInputKalkulator(
        kode,
        [jurnal],
        `Jurnal penyusutan ${nama} Rp ${beban.toLocaleString("id-ID")} berhasil diinput`,
        (k) => {
          lastKalkInput = { kode: k, jurnalIndices: [beforeCount] };
          showKalkUndoBar(`DEP: ${nama} Tahun ke-${t}`, k);
        }
      );
    });
  });
}

export function inputBEPJurnal(): void {
  const harga = parseFloat(readInputVal("bep-harga")) || 0;
  const bv = parseFloat(readInputVal("bep-bv")) || 0;
  const bt = parseFloat(readInputVal("bep-bt")) || 0;
  const vol = parseFloat(readInputVal("bep-vol")) || 0;

  if (!harga || !bt) {
    callOasGlobal("showAlert", "Hitung BEP dulu!");
    return;
  }

  const pendapatan = harga * vol;
  const hpp = bv * vol;
  const today = new Date().toISOString().split("T")[0];
  const kode = nextKode("BEP");

  const jurnals: JurnalEntry[] = [];
  if (pendapatan > 0) {
    jurnals.push({
      tanggal: today,
      ket: `Pendapatan periode BEP [${kode}]`,
      jenis: "Penjualan",
      lines: [
        { akun: "1101", ket: "Kas", debit: pendapatan, kredit: 0 },
        { akun: "4101", ket: "Penjualan Barang", debit: 0, kredit: pendapatan },
      ],
    });
  }
  if (hpp > 0) {
    jurnals.push({
      tanggal: today,
      ket: `HPP periode BEP [${kode}]`,
      jenis: JENIS_JURNAL.BEP,
      lines: [
        { akun: "5101", ket: "HPP", debit: hpp, kredit: 0 },
        {
          akun: "1301",
          ket: "Persediaan Barang Dagangan",
          debit: 0,
          kredit: hpp,
        },
      ],
    });
  }
  if (bt > 0) {
    jurnals.push({
      tanggal: today,
      ket: `Beban tetap periode BEP [${kode}]`,
      jenis: JENIS_JURNAL.BEP,
      lines: [
        {
          akun: "6701",
          ket: "Beban Lain-lain (Biaya Tetap)",
          debit: bt,
          kredit: 0,
        },
        { akun: "1101", ket: "Kas", debit: 0, kredit: bt },
      ],
    });
  }

  if (!jurnals.length) {
    callOasGlobal("showAlert", "Tidak ada data untuk diinput");
    return;
  }

  const beforeCount = readJurnalEntries().length;
  const indices = Array.from({ length: jurnals.length }, (_, i) => beforeCount + i);
  checkAndInputKalkulator(
    kode,
    jurnals,
    `Jurnal BEP (vol:${vol} unit, pendapatan:Rp${pendapatan.toLocaleString("id-ID")}) diinput`,
    (k) => {
      lastKalkInput = { kode: k, jurnalIndices: indices };
      showKalkUndoBar(`BEP: Vol ${vol} unit`, k);
    }
  );
}

export function inputAnuitasJurnal(): void {
  const pokok = parseFloat(readInputVal("an-pokok")) || 0;
  const rate = parseFloat(readInputVal("an-rate")) || 0;
  const tenor = parseInt(readInputVal("an-tenor"), 10) || 0;
  const dp = parseFloat(readInputVal("an-dp")) || 0;

  if (!pokok || !rate || !tenor) {
    callOasGlobal("showAlert", "Hitung anuitas dulu!");
    return;
  }

  const rBln = rate / 100 / 12;
  const pinjaman = pokok - dp;
  const cicilan = (pinjaman * rBln) / (1 - Math.pow(1 + rBln, -tenor));
  const bunga1 = pinjaman * rBln;
  const pokok1 = cicilan - bunga1;
  const today = new Date().toISOString().split("T")[0];
  const kode = nextKode("ANT");

  const jurnals: JurnalEntry[] = [
    {
      tanggal: today,
      ket: `Pencairan pinjaman/kredit [${kode}]`,
      jenis: JENIS_JURNAL.PINJAMAN,
      lines: [
        { akun: "1101", ket: "Kas - penerimaan pinjaman", debit: pinjaman, kredit: 0 },
        {
          akun: "2801",
          ket: "Utang Bank Jangka Panjang",
          debit: 0,
          kredit: pinjaman,
        },
      ],
    },
    {
      tanggal: today,
      ket: `Angsuran ke-1 pinjaman [${kode}]`,
      jenis: JENIS_JURNAL.PINJAMAN,
      lines: [
        {
          akun: "2801",
          ket: "Angsuran pokok",
          debit: Math.round(pokok1),
          kredit: 0,
        },
        {
          akun: "6601",
          ket: "Beban Bunga Pinjaman",
          debit: Math.round(bunga1),
          kredit: 0,
        },
        {
          akun: "1101",
          ket: "Kas keluar",
          debit: 0,
          kredit: Math.round(cicilan),
        },
      ],
    },
  ];

  const beforeCount = readJurnalEntries().length;
  checkAndInputKalkulator(
    kode,
    jurnals,
    `Jurnal pinjaman Rp${pinjaman.toLocaleString("id-ID")} + angsuran ke-1 diinput`,
    (k) => {
      lastKalkInput = { kode: k, jurnalIndices: [beforeCount, beforeCount + 1] };
      showKalkUndoBar(`Anuitas: Pinjaman Rp${pinjaman.toLocaleString("id-ID")}`, k);
    }
  );
}

export function inputPersediaanJurnal(): void {
  const win = window as unknown as { _invMetode?: string };
  const metode = win._invMetode || readInputVal("inv-metode") || "fifo";
  setLegacyKartuStockTab(metode);
  callOasGlobal("showPilihKartuStockPopup", () => {
    callOasGlobal("bukaPopupJurnalSemua");
  });
}

function dispatchKalkSync(detail: { kind: string; tab?: string }): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("oas:kalk-sync", { detail }));
}

export function registerKalkulatorWindowGlobals(): void {
  setOasWindowFn("nextKode", nextKode as (...args: never[]) => unknown);
  setOasWindowFn("isDuplicateKode", isDuplicateKode as (...args: never[]) => unknown);
  setOasWindowFn(
    "checkAndInputKalkulator",
    checkAndInputKalkulator as (...args: never[]) => unknown
  );
  setOasWindowFn("undoLastKalkInput", undoLastKalkInput);
  setOasWindowFn("showKalkUndoBar", showKalkUndoBar as (...args: never[]) => unknown);
  setOasWindowFn("inputPenyusutanJurnal", inputPenyusutanJurnal);
  setOasWindowFn("inputBEPJurnal", inputBEPJurnal);
  setOasWindowFn("inputAnuitasJurnal", inputAnuitasJurnal);
  setOasWindowFn("inputPersediaanJurnal", inputPersediaanJurnal);
  setOasWindowFn("addKalkButtonsIfNeeded", () => {});
  setOasWindowFn("addKalkInputButtons", () => {});

  setOasWindowFn("hitungPenyusutan", () => dispatchKalkSync({ kind: "penyusutan" }));
  setOasWindowFn("hitungBunga", () => dispatchKalkSync({ kind: "bunga" }));
  setOasWindowFn("hitungAnuitas", () => dispatchKalkSync({ kind: "anuitas" }));
  setOasWindowFn("hitungPV", () => dispatchKalkSync({ kind: "pv" }));
  setOasWindowFn("hitungDiskonto", () => dispatchKalkSync({ kind: "diskonto" }));
  setOasWindowFn("hitungRasio", () => dispatchKalkSync({ kind: "rasio" }));
  setOasWindowFn("hitungBEP", () => dispatchKalkSync({ kind: "bep" }));
  setOasWindowFn(
    "switchBungaTab",
    ((tab: string) => dispatchKalkSync({ kind: "bunga-tab", tab })) as (
      ...args: never[]
    ) => unknown
  );
  setOasWindowFn("hitungPersediaan", () => dispatchKalkSync({ kind: "persediaan-calc" }));
  setOasWindowFn("resetInv", () => dispatchKalkSync({ kind: "persediaan-reset" }));
  setOasWindowFn(
    "addInvRow",
    ((jenis: string) =>
      dispatchKalkSync({ kind: "persediaan-add", tab: jenis })) as (
      ...args: never[]
    ) => unknown
  );
}
