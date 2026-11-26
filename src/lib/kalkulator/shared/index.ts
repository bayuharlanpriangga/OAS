import type { JurnalEntry } from "@/types";
import { callOasGlobal, readJurnalEntries, setOasWindowFn } from "../../shared/legacy-store";
import { escapeHtml } from "../../shared/format";
import { inputAnuitasJurnal } from "../bunga";
import { inputBEPJurnal } from "../bep-margin";
import { inputPenyusutanJurnal } from "../penyusutan";
import { inputPersediaanJurnal } from "../persediaan/posting-jurnal";

export interface LastKalkInputState {
  kode: string;
  jurnalIndices: number[];
}

export const KODE_COUNTER_KEY = "oas_kode_counters";

export const kalkulatorState: {
  lastInput: LastKalkInputState | null;
  slideStyleInjected: boolean;
} = {
  lastInput: null,
  slideStyleInjected: false,
};

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

export function readInputVal(id: string): string {
  const el = document.getElementById(id) as
    | HTMLInputElement
    | HTMLSelectElement
    | null;
  return el?.value ?? "";
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

export function isDuplicateKode(kode: string): boolean {
  return readJurnalEntries().some((j) => j.kodeRef === kode);
}

export function showKalkUndoBar(label: string, kode: string): void {
  if (typeof document === "undefined") return;
  if (!kalkulatorState.slideStyleInjected) {
    kalkulatorState.slideStyleInjected = true;
    const style = document.createElement("style");
    style.textContent =
      "@keyframes slideUp { from{transform:translateX(-50%) translateY(20px);opacity:0} to{transform:translateX(-50%) translateY(0);opacity:1} }";
    document.head.appendChild(style);
  }
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

export function undoLastKalkInput(): void {
  if (!kalkulatorState.lastInput) {
    callOasGlobal("showAlert", "Tidak ada input yang bisa di-undo");
    return;
  }
  const { kode, jurnalIndices } = kalkulatorState.lastInput;
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
  kalkulatorState.lastInput = null;
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
